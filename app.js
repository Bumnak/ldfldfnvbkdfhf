import React, { useState, useEffect } from 'react';
import { Calendar, Users, Shield, Clock, Check, X, Plus, Edit2, Trash2, Save } from 'lucide-react';

const WowGuildManager = () => {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [view, setView] = useState('calendar');
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [blizzardToken, setBlizzardToken] = useState(null);
  
  // Configuration API Blizzard (en production, à stocker côté serveur)
  const API_CONFIG = {
    clientId: '9ebca434cd5942b49e18767a832bc9a3',
    clientSecret: 'Q2ZooNhtUa4rJHAQcR1eL8bQde4IKZSR'
  };
  
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    time: '',
    type: 'raid',
    description: ''
  });

  // Charger les événements depuis le stockage
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const result = await window.storage.get('guild-events');
      if (result && result.value) {
        setEvents(JSON.parse(result.value));
      }
    } catch (error) {
      console.log('No events found, starting fresh');
    }
  };

  const saveEvents = async (newEvents) => {
    try {
      await window.storage.set('guild-events', JSON.stringify(newEvents));
      setEvents(newEvents);
    } catch (error) {
      console.error('Error saving events:', error);
    }
  };

  // Obtenir un token d'accès Blizzard
  const getBlizzardToken = async () => {
    try {
      const credentials = btoa(`${API_CONFIG.clientId}:${API_CONFIG.clientSecret}`);
      const response = await fetch('https://oauth.battle.net/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error('Erreur d\'authentification API');
      }

      const data = await response.json();
      setBlizzardToken(data.access_token);
      return data.access_token;
    } catch (error) {
      console.error('Error getting token:', error);
      alert('Erreur lors de l\'obtention du token API.');
      return null;
    }
  };

  // Rechercher un personnage via l'API Blizzard
  const searchCharacter = async (characterName, realm) => {
    let token = blizzardToken;
    if (!token) {
      token = await getBlizzardToken();
      if (!token) return null;
    }

    try {
      const region = 'eu';
      const realmSlug = realm.toLowerCase().replace(/['\s]/g, '-');
      const nameSlug = characterName.toLowerCase();
      
      const response = await fetch(
        `https://${region}.api.blizzard.com/profile/wow/character/${realmSlug}/${nameSlug}?namespace=profile-${region}&locale=fr_FR`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Personnage non trouvé');
      }

      const data = await response.json();
      
      // Récupérer les équipements pour l'ilvl
      const equipmentResponse = await fetch(
        `https://${region}.api.blizzard.com/profile/wow/character/${realmSlug}/${nameSlug}/equipment?namespace=profile-${region}&locale=fr_FR`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const equipmentData = await equipmentResponse.json();

      return {
        name: data.name,
        realm: data.realm.name,
        class: data.character_class.name,
        level: data.level,
        itemLevel: equipmentData.equipped_item_level || 0,
        spec: data.active_spec?.name || 'Non spécifié',
        faction: data.faction.name,
        guild: data.guild?.name || 'Sans guilde'
      };
    } catch (error) {
      console.error('Error fetching character:', error);
      alert('Impossible de récupérer les données du personnage. Vérifiez le nom et le serveur.');
      return null;
    }
  };

  const handleRealLogin = async () => {
    const characterName = prompt('Nom de votre personnage :');
    if (!characterName) return;

    const realm = prompt('Serveur (ex: Kirin Tor, Hyjal, etc.) :');
    if (!realm) return;

    const characterData = await searchCharacter(characterName, realm);
    if (characterData) {
      const avatar = getClassEmoji(characterData.class);
      setUser({ ...characterData, avatar });
    }
  };

  const handleMockLogin = () => {
    const mockUser = {
      name: 'Thrallion',
      realm: 'Kirin Tor',
      class: 'Chaman',
      level: 80,
      itemLevel: 489,
      spec: 'Amélioration',
      avatar: '🛡️',
      guild: 'Les Gardiens d\'Azeroth'
    };
    setUser(mockUser);
  };

  const getClassEmoji = (className) => {
    const emojis = {
      'Chaman': '🌩️',
      'Guerrier': '⚔️',
      'Paladin': '🛡️',
      'Chasseur': '🏹',
      'Voleur': '🗡️',
      'Prêtre': '✨',
      'Chevalier de la mort': '💀',
      'Mage': '🔮',
      'Démoniste': '🔥',
      'Druide': '🌿',
      'Moine': '🥋',
      'Chasseur de démons': '😈',
      'Évocateur': '🐉'
    };
    return emojis[className] || '⚔️';
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setEventForm({
      title: '',
      date: '',
      time: '',
      type: 'raid',
      description: ''
    });
    setShowEventForm(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      date: event.date,
      time: event.time,
      type: event.type,
      description: event.description || ''
    });
    setShowEventForm(true);
  };

  const handleDeleteEvent = (eventId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      const newEvents = events.filter(e => e.id !== eventId);
      saveEvents(newEvents);
    }
  };

  const handleSaveEvent = () => {
    if (!eventForm.title || !eventForm.date || !eventForm.time) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (editingEvent) {
      const newEvents = events.map(e =>
        e.id === editingEvent.id
          ? { ...e, ...eventForm }
          : e
      );
      saveEvents(newEvents);
    } else {
      const newEvent = {
        id: Date.now(),
        ...eventForm,
        attendees: []
      };
      saveEvents([...events, newEvent]);
    }

    setShowEventForm(false);
    setEventForm({ title: '', date: '', time: '', type: 'raid', description: '' });
  };

  const handleAttendance = (eventId, status) => {
    const newEvents = events.map(event => {
      if (event.id === eventId) {
        const existingIndex = event.attendees.findIndex(a => a.name === user.name);
        let newAttendees = [...event.attendees];
        
        if (existingIndex >= 0) {
          newAttendees[existingIndex] = { ...user, status };
        } else {
          newAttendees.push({ ...user, status });
        }
        
        return { ...event, attendees: newAttendees };
      }
      return event;
    });
    saveEvents(newEvents);
  };

  const getAttendanceStatus = (eventId) => {
    const event = events.find(e => e.id === eventId);
    const attendance = event?.attendees.find(a => a.name === user?.name);
    return attendance?.status || null;
  };

  const getEventTypeColor = (type) => {
    switch(type) {
      case 'raid': return 'bg-purple-600';
      case 'dungeon': return 'bg-blue-600';
      case 'pvp': return 'bg-red-600';
      case 'other': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const getClassColor = (className) => {
    const colors = {
      'Chaman': 'text-blue-400',
      'Guerrier': 'text-amber-600',
      'Paladin': 'text-pink-400',
      'Chasseur': 'text-green-500',
      'Voleur': 'text-yellow-400',
      'Prêtre': 'text-white',
      'Chevalier de la mort': 'text-red-600',
      'Mage': 'text-cyan-400',
      'Démoniste': 'text-purple-500',
      'Druide': 'text-orange-500',
      'Moine': 'text-green-400',
      'Chasseur de démons': 'text-purple-700',
      'Évocateur': 'text-emerald-500'
    };
    return colors[className] || 'text-gray-400';
  };

  const testApiConnection = async () => {
    const testButton = document.getElementById('test-api-btn');
    const testResult = document.getElementById('test-result');
    
    if (testButton) testButton.disabled = true;
    if (testResult) testResult.textContent = '🔄 Test en cours...';
    if (testResult) testResult.className = 'text-yellow-400 text-sm mt-2';

    try {
      const token = await getBlizzardToken();
      
      if (!token) {
        if (testResult) testResult.textContent = '❌ Échec d\'authentification';
        if (testResult) testResult.className = 'text-red-400 text-sm mt-2';
        return;
      }

      // Test avec un personnage connu
      const response = await fetch(
        'https://eu.api.blizzard.com/profile/wow/character/kirin-tor/thrallion?namespace=profile-eu&locale=fr_FR',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        if (testResult) testResult.textContent = '✅ API fonctionnelle ! Token valide.';
        if (testResult) testResult.className = 'text-green-400 text-sm mt-2';
      } else {
        if (testResult) testResult.textContent = `⚠️ Token OK mais erreur ${response.status}`;
        if (testResult) testResult.className = 'text-orange-400 text-sm mt-2';
      }
    } catch (error) {
      if (testResult) testResult.textContent = `❌ Erreur: ${error.message}`;
      if (testResult) testResult.className = 'text-red-400 text-sm mt-2';
    } finally {
      if (testButton) testButton.disabled = false;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">⚔️</div>
          <h1 className="text-3xl font-bold text-white mb-2">Gestionnaire de Guilde</h1>
          <p className="text-slate-300 mb-6">Connectez-vous avec votre personnage WoW</p>
          
          <div className="space-y-3">
            <button
              onClick={handleRealLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg w-full transition-colors flex items-center justify-center gap-2"
            >
              <Shield className="w-5 h-5" />
              Connexion via API Blizzard
            </button>
            
            <button
              onClick={handleMockLogin}
              className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg w-full transition-colors"
            >
              Mode Démo
            </button>

            <div className="pt-4 border-t border-slate-700">
              <button
                id="test-api-btn"
                onClick={testApiConnection}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm py-2 px-4 rounded-lg w-full transition-colors"
              >
                🔧 Tester la connexion API
              </button>
              <div id="test-result" className="text-slate-400 text-sm mt-2 min-h-[20px]"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl">⚔️</div>
            <div>
              <h1 className="text-xl font-bold text-white">{user.guild}</h1>
              <p className="text-sm text-slate-400">{user.realm}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className={`font-semibold ${getClassColor(user.class)}`}>
                {user.name}
              </p>
              <p className="text-xs text-slate-400">
                {user.spec} {user.class} • iLvl {user.itemLevel}
              </p>
            </div>
            <div className="text-3xl">{user.avatar}</div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                view === 'calendar'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendrier
            </button>
            <button
              onClick={() => setView('roster')}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                view === 'roster'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Roster
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'calendar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Événements à venir</h2>
              <button
                onClick={handleCreateEvent}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Créer un événement
              </button>
            </div>

            {events.length === 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-12 text-center">
                <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg mb-4">Aucun événement prévu</p>
                <button
                  onClick={handleCreateEvent}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Créer le premier événement
                </button>
              </div>
            )}
            
            {events
              .sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time))
              .map(event => {
                const status = getAttendanceStatus(event.id);
                const acceptedCount = event.attendees.filter(a => a.status === 'accepted').length;
                const declinedCount = event.attendees.filter(a => a.status === 'declined').length;
                const tentativeCount = event.attendees.filter(a => a.status === 'tentative').length;

                return (
                  <div
                    key={event.id}
                    className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded text-xs font-semibold text-white ${getEventTypeColor(event.type)}`}>
                              {event.type === 'raid' ? 'RAID' : event.type === 'dungeon' ? 'DONJON' : event.type === 'pvp' ? 'PVP' : 'AUTRE'}
                            </span>
                            <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                          </div>
                          
                          <div className="flex items-center gap-4 text-slate-400 text-sm mb-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(event.date).toLocaleDateString('fr-FR', { 
                                weekday: 'long', 
                                day: 'numeric', 
                                month: 'long' 
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {event.time}
                            </span>
                          </div>

                          {event.description && (
                            <p className="text-slate-400 text-sm mt-2">{event.description}</p>
                          )}

                          <div className="flex gap-4 mt-3 text-sm">
                            <span className="text-green-400">✓ {acceptedCount} Présent</span>
                            <span className="text-yellow-400">? {tentativeCount} Incertain</span>
                            <span className="text-red-400">✗ {declinedCount} Absent</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditEvent(event)}
                            className="text-slate-400 hover:text-blue-400 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => handleAttendance(event.id, 'accepted')}
                          className={`px-4 py-2 rounded font-medium transition-colors flex items-center justify-center gap-2 ${
                            status === 'accepted'
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          Présent
                        </button>
                        
                        <button
                          onClick={() => handleAttendance(event.id, 'tentative')}
                          className={`px-4 py-2 rounded font-medium transition-colors flex items-center justify-center gap-2 ${
                            status === 'tentative'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          ?
                          Incertain
                        </button>
                        
                        <button
                          onClick={() => handleAttendance(event.id, 'declined')}
                          className={`px-4 py-2 rounded font-medium transition-colors flex items-center justify-center gap-2 ${
                            status === 'declined'
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          <X className="w-4 h-4" />
                          Absent
                        </button>
                      </div>

                      {event.attendees.length > 0 && (
                        <div className="pt-4 border-t border-slate-700">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            {['accepted', 'tentative', 'declined'].map(statusType => {
                              const filtered = event.attendees.filter(a => a.status === statusType);
                              if (filtered.length === 0) return null;
                              
                              return (
                                <div key={statusType}>
                                  <h4 className={`font-semibold mb-2 ${
                                    statusType === 'accepted' ? 'text-green-400' :
                                    statusType === 'tentative' ? 'text-yellow-400' :
                                    'text-red-400'
                                  }`}>
                                    {statusType === 'accepted' ? 'Présents' :
                                     statusType === 'tentative' ? 'Incertains' :
                                     'Absents'}
                                  </h4>
                                  <ul className="space-y-1">
                                    {filtered.map((attendee, idx) => (
                                      <li key={idx} className={getClassColor(attendee.class)}>
                                        {attendee.name}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {view === 'roster' && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Roster de la Guilde</h2>
            <p className="text-slate-400 text-center py-8">
              Cette section affichera la liste complète des membres de la guilde.
              <br />
              Utilisez l'API Blizzard pour récupérer les membres de votre guilde.
            </p>
          </div>
        )}
      </main>

      {/* Modal de création/édition d'événement */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm block mb-1">Titre *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                  placeholder="Ex: Raid Mythique - Nerub-ar Palace"
                />
              </div>

              <div>
                <label className="text-slate-300 text-sm block mb-1">Type *</label>
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm({...eventForm, type: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                >
                  <option value="raid">Raid</option>
                  <option value="dungeon">Donjon M+</option>
                  <option value="pvp">PvP</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Date *</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300 text-sm block mb-1">Heure *</label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 text-sm block mb-1">Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white h-24 resize-none"
                  placeholder="Détails de l'événement..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEvent}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                Sauvegarder
              </button>
              <button
                onClick={() => setShowEventForm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WowGuildManager;
