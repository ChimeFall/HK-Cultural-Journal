import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getDeviceId } from '../utils/deviceId'

const useStore = create(
  persist(
    (set, get) => ({
      lang: 'hant',
      toggleLang: () => set((state) => ({ lang: state.lang === 'hant' ? 'hans' : 'hant' })),
      setLang: (lang) => set({ lang }),

      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),

      selectedDistrict: '',
      setSelectedDistrict: (district) => set({ selectedDistrict: district }),

      selectedYear: '',
      setSelectedYear: (year) => set({ selectedYear: year }),

      favorites: [],
      setFavorites: (favorites) => set({ favorites }),
      fetchFavorites: async () => {
        const res = await fetch('/api/favorites', {
          headers: { 'x-device-id': getDeviceId() },
        })
        const json = await res.json()
        if (json.success) {
          set({ favorites: json.data.map((item) => item.location_id) })
        }
      },
      addFavorite: async (locationId) => {
        set((state) => ({ favorites: [...state.favorites, locationId] }))
        try {
          const res = await fetch('/api/favorites', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-device-id': getDeviceId(),
            },
            body: JSON.stringify({ location_id: locationId }),
          })
          const json = await res.json()
          if (!json.success) {
            set((state) => ({ favorites: state.favorites.filter((id) => id !== locationId) }))
            alert(json.message || '收藏失败')
          }
        } catch (e) {
          set((state) => ({ favorites: state.favorites.filter((id) => id !== locationId) }))
          alert('网络错误，收藏失败')
        }
      },
      removeFavorite: async (locationId) => {
        const prev = get().favorites
        set((state) => ({ favorites: state.favorites.filter((id) => id !== locationId) }))
        try {
          const res = await fetch(`/api/favorites/${locationId}`, {
            method: 'DELETE',
            headers: { 'x-device-id': getDeviceId() },
          })
          const json = await res.json()
          if (!json.success) {
            set({ favorites: prev })
            alert(json.message || '取消收藏失败')
          }
        } catch (e) {
          set({ favorites: prev })
          alert('网络错误，取消收藏失败')
        }
      },
      isFavorite: (locationId) => get().favorites.includes(locationId),

      checkins: [],
      setCheckins: (checkins) => set({ checkins }),
      fetchCheckins: async () => {
        const res = await fetch('/api/checkins', {
          headers: { 'x-device-id': getDeviceId() },
        })
        const json = await res.json()
        if (json.success) {
          set({ checkins: json.data.map((item) => item.location_id) })
        }
      },
      isCheckin: (locationId) => get().checkins.includes(locationId),

      checkinRecords: [],
      setCheckinRecords: (records) => set({ checkinRecords: records }),
      fetchCheckinRecords: async () => {
        const res = await fetch('/api/checkins', {
          headers: { 'x-device-id': getDeviceId() },
        })
        const json = await res.json()
        if (json.success) {
          set({
            checkinRecords: json.data,
            checkins: json.data.map((item) => item.location_id),
          })
        }
      },

      isTestMode: false,
      setIsTestMode: (val) => set({ isTestMode: val }),
      mockLocation: null,
      setMockLocation: (loc) => set({ mockLocation: loc }),

      userLocation: null,
      setUserLocation: (loc) => set({ userLocation: loc }),

      achievements: [],
      totalCheckins: 0,
      achievementsLoading: false,
      fetchAchievements: async () => {
        set({ achievementsLoading: true })
        try {
          const res = await fetch('/api/achievements', {
            headers: { 'x-device-id': getDeviceId() },
          })
          const json = await res.json()
          if (json.success) {
            set({ achievements: json.data.badges, totalCheckins: json.data.total_checkins })
          }
        } catch (e) {
          console.error(e)
        } finally {
          set({ achievementsLoading: false })
        }
      },

      newlyUnlockedBadges: [],
      setNewlyUnlockedBadges: (badges) => set({ newlyUnlockedBadges: badges }),
      clearNewlyUnlockedBadges: () => set({ newlyUnlockedBadges: [] }),

      nearbyLocations: [],
      setNearbyLocations: (locations) => set({ nearbyLocations: locations }),
      clearNearbyLocations: () => set({ nearbyLocations: [] }),
    }),
    {
      name: 'hk-journal-store',
      partialize: (state) => ({
        lang: state.lang,
        favorites: state.favorites,
        searchQuery: state.searchQuery,
        selectedDistrict: state.selectedDistrict,
        selectedYear: state.selectedYear,
      }),
    }
  )
)

export default useStore
