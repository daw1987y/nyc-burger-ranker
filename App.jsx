import React, { useState, useEffect } from 'react';
import { Search, GripVertical, Star, Trophy, MapPin, MessageSquare, Trash2, Plus, Sparkles, Tag, Filter, X, User, UserPlus, Users, Settings } from 'lucide-react';

// REPLACE THIS WITH YOUR FIREBASE CONFIG
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDf4YlQKv5c9lEK7IX4k8XZCdzkAAuC0bY",
  authDomain: "burger-rating-app.firebaseapp.com",
  projectId: "burger-rating-app",
  storageBucket: "burger-rating-app.firebasestorage.app",
  messagingSenderId: "148456854796",
  appId: "1:148456854796:web:a750700ca0b7eb65d1a529"
};

export default function NYCBurgerRanker() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [rankedBurgers, setRankedBurgers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragSource, setDragSource] = useState(null);
  const [view, setView] = useState('ranking'); // 'ranking', 'leaderboard', 'following', 'profile'
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState({});
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchResults, setAiSearchResults] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [showRecommended, setShowRecommended] = useState(true);
  const [selectedTags, setSelectedTags] = useState([]);
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  
  // User profile & social features
  const [username, setUsername] = useState('');
  const [hasUsername, setHasUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);

  const recommendedBurgers = [
    { name: "Raoul's", address: "180 Prince St, NY 10012", place_id: "raouls", source: "Eater", tags: ["Classic", "Upscale"] },
    { name: "J.G. Melon", address: "1291 3rd Ave, NY 10021", place_id: "jgmelon", source: "Timeout", tags: ["Classic", "No-frills"] },
    { name: "Corner Bistro", address: "331 W 4th St, NY 10014", place_id: "corner", source: "Eater", tags: ["Classic", "Dive Bar"] },
    { name: "Shake Shack", address: "Multiple Locations", place_id: "shakeshack", source: "Timeout", tags: ["Chain", "Fast Casual"] },
    { name: "Superiority Burger", address: "119 Avenue A, NY 10009", place_id: "superiority", source: "Eater", tags: ["Vegetarian"] },
    { name: "Emily", address: "Multiple Locations", place_id: "emily", source: "Eater", tags: ["Upscale"] },
    { name: "Minetta Tavern", address: "113 MacDougal St, NY 10012", place_id: "minetta", source: "Eater", tags: ["Upscale", "Classic"] },
    { name: "Burger Joint", address: "119 W 56th St, NY 10019", place_id: "burgerjoint", source: "Timeout", tags: ["Hidden Gem"] },
    { name: "Peter Luger", address: "178 Broadway, Brooklyn", place_id: "luger", source: "Eater", tags: ["Steakhouse"] },
    { name: "Black Tap", address: "Multiple Locations", place_id: "blacktap", source: "Timeout", tags: ["Instagrammable"] },
    { name: "Flip Sigi", address: "324 E 11th St, NY 10003", place_id: "flipsigi", source: "Eater", tags: ["Smash Burger"] },
  ];

  const allTags = ["Classic", "Upscale", "Vegetarian", "Smash Burger", "Fast Casual", "Gastropub", "Dive Bar", "Hidden Gem", "Steakhouse", "Chain", "No-frills", "Instagrammable"];

  useEffect(() => {
    const initFirebase = async () => {
      try {
        const firebaseApp = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const firebaseFirestore = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const app = firebaseApp.initializeApp(FIREBASE_CONFIG);
        const firestore = firebaseFirestore.getFirestore(app);
        setDb(firestore);

        let storedUserId = localStorage.getItem('burger-ranker-user-id');
        if (!storedUserId) {
          storedUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('burger-ranker-user-id', storedUserId);
        }
        setUserId(storedUserId);

        await loadData(firestore, storedUserId);
      } catch (error) {
        console.error('Firebase initialization error:', error);
        alert('Could not connect to database. Please check your Firebase configuration.');
        setIsLoading(false);
      }
    };

    initFirebase();
  }, []);

  const loadData = async (firestore, uid) => {
    try {
      const { collection, query, getDocs, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      
      // Load user profile
      const userDocRef = doc(firestore, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        setRankedBurgers(data.ranking || []);
        if (data.username) {
          setUsername(data.username);
          setHasUsername(true);
        }
        setFollowing(data.following || []);
      }

      // Load all users for discovery
      await loadAllUsers(firestore);
      
      // Load followers
      await loadFollowers(firestore, uid);

      await updateLeaderboard(firestore);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  const loadAllUsers = async (firestore) => {
    try {
      const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const usersRef = collection(firestore, 'users');
      const snapshot = await getDocs(usersRef);
      
      const users = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.username) {
          users.push({
            userId: doc.id,
            username: data.username,
            rankingCount: data.ranking?.length || 0,
            updatedAt: data.updatedAt,
          });
        }
      });
      
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadFollowers = async (firestore, uid) => {
    try {
      const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('following', 'array-contains', uid));
      const snapshot = await getDocs(q);
      
      const followersList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.username) {
          followersList.push(data.username);
        }
      });
      
      setFollowers(followersList);
    } catch (error) {
      console.error('Error loading followers:', error);
    }
  };

  const setUsernameHandler = async () => {
    if (!tempUsername.trim()) {
      alert('Please enter a username');
      return;
    }

    if (tempUsername.length < 3) {
      alert('Username must be at least 3 characters');
      return;
    }

    if (!db) {
      alert('Database not ready yet. Please wait a moment and try again.');
      console.error('Database not initialized');
      return;
    }

    if (!userId) {
      alert('User ID not ready. Please refresh the page.');
      console.error('User ID not set');
      return;
    }

    try {
      const { doc, setDoc, getDoc, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      
      console.log('Checking if username exists...');
      // Check if username is taken
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', tempUsername.trim()));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        alert('Username already taken. Please choose another.');
        return;
      }

      console.log('Creating user profile...');
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, {
        username: tempUsername.trim(),
        ranking: [],
        following: [],
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      console.log('Username set successfully!');
      setUsername(tempUsername.trim());
      setHasUsername(true);
      setTempUsername('');
      await loadAllUsers(db);
    } catch (error) {
      console.error('Error setting username:', error);
      alert(`Error setting username: ${error.message}. Please check your Firebase configuration.`);
    }
  };

  const followUser = async (targetUserId) => {
    if (!db || !userId || !hasUsername) return;

    try {
      const { doc, updateDoc, arrayUnion } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        following: arrayUnion(targetUserId)
      });

      setFollowing([...following, targetUserId]);
      await loadAllUsers(db);
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const unfollowUser = async (targetUserId) => {
    if (!db || !userId) return;

    try {
      const { doc, updateDoc, arrayRemove } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        following: arrayRemove(targetUserId)
      });

      setFollowing(following.filter(id => id !== targetUserId));
      await loadAllUsers(db);
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const viewUserProfile = async (targetUserId) => {
    if (!db) return;

    try {
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      
      const userDocRef = doc(db, 'users', targetUserId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setSelectedUserProfile({
          userId: targetUserId,
          username: data.username,
          ranking: data.ranking || [],
          updatedAt: data.updatedAt,
        });
        setView('profile');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const updateLeaderboard = async (firestore) => {
    try {
      const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      
      const submissionsRef = collection(firestore, 'submissions');
      const snapshot = await getDocs(submissionsRef);
      
      const burgerScores = {};
      snapshot.forEach((doc) => {
        const submission = doc.data();
        submission.burgers?.forEach((burger, index) => {
          const placeId = burger.place_id || burger.name;
          if (!burgerScores[placeId]) {
            burgerScores[placeId] = {
              name: burger.name,
              address: burger.address,
              place_id: burger.place_id,
              totalPoints: 0,
              totalRatings: 0,
              submissions: 0,
              comments: [],
              tags: burger.tags || [],
            };
          }
          
          const points = 10 - index;
          burgerScores[placeId].totalPoints += points;
          burgerScores[placeId].totalRatings += burger.rating;
          burgerScores[placeId].submissions += 1;
          
          if (burger.comments?.trim()) {
            burgerScores[placeId].comments.push(burger.comments.trim());
          }
        });
      });

      const leaderboardData = Object.values(burgerScores)
        .map((burger) => ({
          ...burger,
          avgRating: (burger.totalRatings / burger.submissions).toFixed(1),
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 20);

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error updating leaderboard:', error);
    }
  };

  const handleAiSearch = async () => {
    if (!aiSearchQuery.trim()) return;
    setIsAiSearching(true);
    setAiSearchResults('');
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a NYC burger expert. Based on this request: "${aiSearchQuery}", recommend 2-3 specific burger spots in NYC with their neighborhoods. Be concise. Format: Restaurant Name (Neighborhood) - brief reason why.`
          }],
        }),
      });

      const data = await response.json();
      const textContent = data.content.filter(block => block.type === 'text').map(block => block.text).join('\n');
      setAiSearchResults(textContent);
    } catch (error) {
      setAiSearchResults('Could not get recommendations. Try the search bar or browse recommended spots below.');
    }
    setIsAiSearching(false);
  };

  const searchBurgers = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    
    const allBurgers = [...recommendedBurgers];
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = allBurgers.filter(b => 
      b.name.toLowerCase().includes(lowerQuery) || 
      b.address.toLowerCase().includes(lowerQuery)
    );
    
    setSearchResults(filtered.length > 0 ? filtered.slice(0, 5) : [
      { name: searchQuery, address: "New York, NY", place_id: `custom-${Date.now()}` }
    ]);
    setIsSearching(false);
  };

  const addBurger = (place) => {
    if (rankedBurgers.length >= 10) {
      alert('You can only rank 10 burgers!');
      return;
    }
    if (rankedBurgers.some(b => b.place_id === place.place_id)) {
      alert('This burger is already in your ranking!');
      return;
    }

    setRankedBurgers([...rankedBurgers, {
      place_id: place.place_id,
      name: place.name,
      address: place.address,
      rating: 5,
      comments: '',
      tags: place.tags || [],
    }]);
    setSearchResults([]);
    setSearchQuery('');
  };

  const removeBurger = (index) => {
    setRankedBurgers(rankedBurgers.filter((_, i) => i !== index));
  };

  const updateBurger = (index, field, value) => {
    const updated = [...rankedBurgers];
    updated[index][field] = value;
    setRankedBurgers(updated);
  };

  const handleDragStart = (index, source = 'ranked') => {
    setDraggedIndex(index);
    setDragSource(source);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragSource !== 'ranked' || draggedIndex === null || draggedIndex === index) return;
    const items = [...rankedBurgers];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);
    setRankedBurgers(items);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragSource(null);
  };

  const handleDropFromRecommended = (e, targetIndex) => {
    e.preventDefault();
    if (dragSource !== 'recommended' || draggedIndex === null) return;

    const burger = recommendedBurgers[draggedIndex];
    if (rankedBurgers.length >= 10) {
      alert('You can only rank 10 burgers!');
      handleDragEnd();
      return;
    }
    if (rankedBurgers.some(b => b.place_id === burger.place_id)) {
      alert('This burger is already in your ranking!');
      handleDragEnd();
      return;
    }

    const items = [...rankedBurgers];
    items.splice(targetIndex, 0, { ...burger, rating: 5, comments: '' });
    setRankedBurgers(items);
    handleDragEnd();
  };

  const saveRanking = async () => {
    if (rankedBurgers.length === 0) {
      alert('Please add at least one burger!');
      return;
    }

    if (!hasUsername) {
      alert('Please set a username first!');
      return;
    }

    if (!db || !userId) {
      alert('Database not ready. Please refresh and try again.');
      return;
    }

    try {
      const { doc, setDoc, collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, {
        username: username,
        ranking: rankedBurgers,
        following: following,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      const submissionsRef = collection(db, 'submissions');
      await addDoc(submissionsRef, {
        userId: userId,
        username: username,
        burgers: rankedBurgers,
        timestamp: new Date().toISOString(),
      });

      setHasSubmitted(true);
      await updateLeaderboard(db);
      setTimeout(() => setView('leaderboard'), 1000);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving ranking. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🍔</div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  // Username setup screen
  if (!hasUsername) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">🍔</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to NYC Burger Ranker!</h1>
            <p className="text-gray-600">Choose a username to get started</p>
          </div>
          
          {!db ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Connecting to database...</p>
              <p className="text-xs text-gray-500 mt-2">If this takes too long, check your Firebase config</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && setUsernameHandler()}
                  placeholder="Enter username (min 3 characters)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={setUsernameHandler}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                Create Profile
              </button>
              
              <p className="text-xs text-gray-500 text-center">
                You'll be able to follow other users and see their burger rankings!
              </p>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800">
                  <strong>Tip:</strong> Make sure you've set up Firebase correctly. Check the browser console (F12) if you see errors.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const filteredLeaderboard = selectedTags.length > 0
    ? leaderboard.filter(burger => 
        burger.tags.some(tag => selectedTags.includes(tag))
      )
    : leaderboard;

  const filteredUsers = userSearchQuery.trim()
    ? allUsers.filter(u => 
        u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) && 
        u.userId !== userId
      )
    : allUsers.filter(u => u.userId !== userId);

  const followingUsers = allUsers.filter(u => following.includes(u.userId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6 pt-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-2">🍔 NYC Burger Ranker</h1>
          <p className="text-gray-600">Rank your top 10 favorite burgers in New York City</p>
          <div className="mt-2 flex items-center justify-center gap-2 text-sm">
            <User className="w-4 h-4 text-orange-600" />
            <span className="font-medium text-gray-700">@{username}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">{following.length} following</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">{followers.length} followers</span>
          </div>
        </div>

        <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow-sm overflow-x-auto">
          <button
            onClick={() => setView('ranking')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-all whitespace-nowrap ${
              view === 'ranking' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            My Ranking
          </button>
          <button
            onClick={() => setView('leaderboard')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-all whitespace-nowrap ${
              view === 'leaderboard' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Trophy className="inline w-5 h-5 mr-1" />
            Leaderboard
          </button>
          <button
            onClick={() => setView('following')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-all whitespace-nowrap ${
              view === 'following' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="inline w-5 h-5 mr-1" />
            Following ({following.length})
          </button>
        </div>

        {view === 'ranking' && (
          <>
            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchBurgers()}
                    placeholder="Search for burger spots in NYC..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={searchBurgers}
                  disabled={isSearching}
                  className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-300"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {searchResults.map((place, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{place.name}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {place.address}
                        </div>
                      </div>
                      <button
                        onClick={() => addBurger(place)}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Search */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-sm p-6 mb-6 border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-800">AI Burger Finder</h3>
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={aiSearchQuery}
                  onChange={(e) => setAiSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAiSearch()}
                  placeholder="E.g., I'm in the West Village, find me a burger spot"
                  className="flex-1 px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleAiSearch}
                  disabled={isAiSearching}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAiSearching ? 'Thinking...' : 'Ask AI'}
                </button>
              </div>
              {aiSearchResults && (
                <div className="bg-white p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{aiSearchResults}</p>
                </div>
              )}
            </div>

            {/* Recommended */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">🏆 Recommended by Eater & Timeout</h3>
                <button onClick={() => setShowRecommended(!showRecommended)} className="text-sm text-orange-600">
                  {showRecommended ? 'Hide' : 'Show'}
                </button>
              </div>
              {showRecommended && (
                <div>
                  <p className="text-sm text-gray-600 mb-4">Drag and drop these into your ranking!</p>
                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                    {recommendedBurgers.map((burger, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={() => handleDragStart(idx, 'recommended')}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border-2 cursor-move ${
                          dragSource === 'recommended' && draggedIndex === idx
                            ? 'border-orange-500 bg-orange-50 shadow-lg'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <div className="flex-1 flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-800">{burger.name}</div>
                            <div className="text-xs text-gray-600">{burger.address}</div>
                            <div className="flex gap-1 mt-1">
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{burger.source}</span>
                              {burger.tags.slice(0, 2).map((tag, i) => (
                                <span key={i} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{tag}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => addBurger(burger)} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg ml-2">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ranked List - abbreviated for space */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Your Top Burgers</h2>
              <p className="text-sm text-gray-600 mb-4">{rankedBurgers.length} of 10 burgers ranked</p>
              
              {rankedBurgers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">🍔</div>
                  <p>Drag burgers from recommended list or search to add them!</p>
                </div>
              ) : (
                <div 
                  className="space-y-3"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => dragSource === 'recommended' && handleDropFromRecommended(e, rankedBurgers.length)}
                >
                  {rankedBurgers.map((burger, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`border-2 rounded-lg p-4 cursor-move ${
                        draggedIndex === index && dragSource === 'ranked'
                          ? 'border-orange-500 bg-orange-50 shadow-lg'
                          : 'border-gray-200 bg-white hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                            {index + 1}
                          </div>
                          <GripVertical className="w-5 h-5 text-gray-400" />
                        </div>

                        <div className="flex-1 space-y-3">
                          <div>
                            <input
                              type="text"
                              value={burger.name}
                              onChange={(e) => updateBurger(index, 'name', e.target.value)}
                              className="font-bold text-gray-800 text-lg w-full border-b border-transparent hover:border-gray-300 focus:border-orange-500 focus:outline-none bg-transparent px-1"
                            />
                            <div className="flex items-start gap-1 mt-1">
                              <MapPin className="w-3 h-3 mt-1 text-gray-400" />
                              <input
                                type="text"
                                value={burger.address}
                                onChange={(e) => updateBurger(index, 'address', e.target.value)}
                                className="text-sm text-gray-600 flex-1 border-b border-transparent hover:border-gray-300 focus:border-orange-500 focus:outline-none bg-transparent px-1"
                                placeholder="Add address..."
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Rating:</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => updateBurger(index, 'rating', star)}>
                                  <Star className={`w-6 h-6 ${star <= burger.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                              <MessageSquare className="w-4 h-4" />
                              Comments
                            </label>
                            <textarea
                              value={burger.comments}
                              onChange={(e) => updateBurger(index, 'comments', e.target.value)}
                              placeholder="What makes this burger special?"
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                              rows="2"
                            />
                          </div>

                          <div>
                            <label className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                              <Tag className="w-4 h-4" />
                              Labels
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {burger.tags?.map((tag, tagIdx) => (
                                <span key={tagIdx} className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded">
                                  {tag}
                                  <button onClick={() => updateBurger(index, 'tags', burger.tags.filter((_, i) => i !== tagIdx))}>
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                              <select
                                onChange={(e) => {
                                  if (e.target.value && !burger.tags?.includes(e.target.value)) {
                                    updateBurger(index, 'tags', [...(burger.tags || []), e.target.value]);
                                    e.target.value = '';
                                  }
                                }}
                                className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                              >
                                <option value="">+ Add label</option>
                                {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>

                        <button onClick={() => removeBurger(index)} className="text-red-500 hover:text-red-700 p-2">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {rankedBurgers.length > 0 && (
              <div className="text-center">
                <button
                  onClick={saveRanking}
                  className="bg-green-500 text-white px-8 py-4 rounded-lg text-lg font-bold hover:bg-green-600 shadow-lg"
                >
                  {hasSubmitted ? '✓ Update My Ranking' : 'Submit My Ranking'}
                </button>
                <p className="text-sm text-gray-600 mt-2">Your ranking will be visible to your followers!</p>
              </div>
            )}
          </>
        )}

        {view === 'leaderboard' && (
          <div>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-800">Filter by labels:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTags(prev => 
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      );
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedTags.includes(tag)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {selectedTags.length > 0 && (
                  <button onClick={() => setSelectedTags([])} className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">
                    Clear all
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Trophy className="w-8 h-8 text-yellow-500" />
                NYC's Best Burgers
              </h2>

              {filteredLeaderboard.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">🏆</div>
                  <p>{selectedTags.length > 0 ? 'No burgers match your filters' : 'No submissions yet. Be the first to rank!'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLeaderboard.map((burger, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-4 p-4 hover:bg-gray-100">
                        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                          {index === 0 && <span className="text-4xl">🥇</span>}
                          {index === 1 && <span className="text-4xl">🥈</span>}
                          {index === 2 && <span className="text-4xl">🥉</span>}
                          {index > 2 && (
                            <div className="w-10 h-10 bg-gray-300 text-gray-700 rounded-full flex items-center justify-center font-bold">
                              {index + 1}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-800 text-lg">{burger.name}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {burger.address}
                          </div>
                          {burger.tags?.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {burger.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1 justify-end mb-1">
                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                            <span className="font-bold text-lg">{burger.avgRating}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {burger.submissions} {burger.submissions === 1 ? 'vote' : 'votes'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'following' && (
          <div>
            {/* Search Users */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Discover Users</h3>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search for users..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredUsers.slice(0, 10).map((user) => (
                  <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <div className="flex-1 cursor-pointer" onClick={() => viewUserProfile(user.userId)}>
                      <div className="font-medium text-gray-800">@{user.username}</div>
                      <div className="text-xs text-gray-600">{user.rankingCount} burgers ranked</div>
                    </div>
                    {following.includes(user.userId) ? (
                      <button
                        onClick={() => unfollowUser(user.userId)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300"
                      >
                        Following
                      </button>
                    ) : (
                      <button
                        onClick={() => followUser(user.userId)}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 flex items-center gap-1"
                      >
                        <UserPlus className="w-4 h-4" />
                        Follow
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Following List */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">People You Follow ({following.length})</h3>
              {followingUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>You're not following anyone yet</p>
                  <p className="text-sm mt-2">Search for users above to start following!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {followingUsers.map((user) => (
                    <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <div className="flex-1 cursor-pointer" onClick={() => viewUserProfile(user.userId)}>
                        <div className="font-medium text-gray-800">@{user.username}</div>
                        <div className="text-xs text-gray-600">{user.rankingCount} burgers ranked</div>
                      </div>
                      <button
                        onClick={() => viewUserProfile(user.userId)}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600"
                      >
                        View Profile
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'profile' && selectedUserProfile && (
          <div>
            <button
              onClick={() => setView('following')}
              className="mb-4 text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              ← Back to Following
            </button>
            
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">@{selectedUserProfile.username}</h2>
                  <p className="text-sm text-gray-600">{selectedUserProfile.ranking.length} burgers ranked</p>
                </div>
                {following.includes(selectedUserProfile.userId) ? (
                  <button
                    onClick={() => unfollowUser(selectedUserProfile.userId)}
                    className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300"
                  >
                    Following
                  </button>
                ) : (
                  <button
                    onClick={() => followUser(selectedUserProfile.userId)}
                    className="bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 flex items-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    Follow
                  </button>
                )}
              </div>

              <h3 className="text-lg font-bold text-gray-800 mb-4">Their Top Burgers</h3>
              {selectedUserProfile.ranking.length === 0 ? (
                <p className="text-gray-500 text-center py-8">This user hasn't ranked any burgers yet</p>
              ) : (
                <div className="space-y-3">
                  {selectedUserProfile.ranking.map((burger, index) => (
                    <div key={index} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-800 text-lg">{burger.name}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {burger.address}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className={`w-5 h-5 ${star <= burger.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                              ))}
                            </div>
                          </div>
                          {burger.comments && (
                            <div className="mt-2 text-sm text-gray-700 italic bg-white p-3 rounded border-l-2 border-orange-500">
                              "{burger.comments}"
                            </div>
                          )}
                          {burger.tags?.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {burger.tags.map((tag, i) => (
                                <span key={i} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500 pb-8">
          <p>🍔 Share your burger rankings with friends!</p>
        </div>
      </div>
    </div>
  );
}
