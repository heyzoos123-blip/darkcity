import { create } from 'zustand';
import type { Agent, Event, AgentLocation, District, Zone } from '@/types';

interface AppState {
  // User & Auth
  currentUser: string | null;
  setCurrentUser: (userId: string | null) => void;
  
  // Selected Agent
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;
  
  // City State
  districts: District[];
  setDistricts: (districts: District[]) => void;
  
  currentDistrict: string | null;
  setCurrentDistrict: (districtId: string | null) => void;
  
  currentZone: string | null;
  setCurrentZone: (zoneId: string | null) => void;
  
  // Real-time Data
  events: Event[];
  addEvent: (event: Event) => void;
  removeEvent: (eventId: string) => void;
  clearEvents: () => void;
  
  agentLocations: Map<string, AgentLocation>;
  updateAgentLocation: (agentId: string, location: AgentLocation) => void;
  
  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  eventFeedOpen: boolean;
  toggleEventFeed: () => void;
  setEventFeedOpen: (open: boolean) => void;
  
  selectedLocation: string | null;
  setSelectedLocation: (locationId: string | null) => void;
  
  // Interaction State
  activeInteractionId: string | null;
  setActiveInteractionId: (interactionId: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  // User & Auth
  currentUser: null,
  setCurrentUser: (userId) => set({ currentUser: userId }),
  
  // Selected Agent
  selectedAgent: null,
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),
  
  // City State
  districts: [],
  setDistricts: (districts) => set({ districts }),
  
  currentDistrict: null,
  setCurrentDistrict: (districtId) => set({ currentDistrict: districtId }),
  
  currentZone: null,
  setCurrentZone: (zoneId) => set({ currentZone: zoneId }),
  
  // Real-time Data
  events: [],
  addEvent: (event) => set((state) => ({
    events: [event, ...state.events].slice(0, 100) // Keep last 100 events
  })),
  removeEvent: (eventId) => set((state) => ({
    events: state.events.filter(e => e.id !== eventId)
  })),
  clearEvents: () => set({ events: [] }),
  
  agentLocations: new Map(),
  updateAgentLocation: (agentId, location) => set((state) => {
    const newLocations = new Map(state.agentLocations);
    newLocations.set(agentId, location);
    return { agentLocations: newLocations };
  }),
  
  // UI State
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  eventFeedOpen: true,
  toggleEventFeed: () => set((state) => ({ eventFeedOpen: !state.eventFeedOpen })),
  setEventFeedOpen: (open) => set({ eventFeedOpen: open }),
  
  selectedLocation: null,
  setSelectedLocation: (locationId) => set({ selectedLocation: locationId }),
  
  // Interaction State
  activeInteractionId: null,
  setActiveInteractionId: (interactionId) => set({ activeInteractionId: interactionId }),
}));
