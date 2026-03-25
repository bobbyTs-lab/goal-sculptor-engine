import { useState, useCallback, useMemo } from 'react';
import {
  Contact, Interaction, Commitment, RelationshipGoal,
  CircleRing, InfluenceTag, InteractionType,
  loadContacts, saveContacts,
  loadInteractions, saveInteractions,
  loadCommitments, saveCommitments,
  loadRelationshipGoals, saveRelationshipGoals,
  generateId,
} from '@/lib/storage';

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>(() => loadContacts());
  const [interactions, setInteractions] = useState<Interaction[]>(() => loadInteractions());
  const [commitments, setCommitments] = useState<Commitment[]>(() => loadCommitments());
  const [relationshipGoals, setRelationshipGoals] = useState<RelationshipGoal[]>(() => loadRelationshipGoals());

  // --- Contacts CRUD ---

  const persistContacts = useCallback((updated: Contact[]) => {
    setContacts(updated);
    saveContacts(updated);
  }, []);

  const addContact = useCallback((data: Omit<Contact, 'id' | 'createdAt'>) => {
    const contact: Contact = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    persistContacts([contact, ...contacts]);
    return contact;
  }, [contacts, persistContacts]);

  const updateContact = useCallback((id: string, data: Partial<Contact>) => {
    persistContacts(contacts.map(c => c.id === id ? { ...c, ...data } : c));
  }, [contacts, persistContacts]);

  const deleteContact = useCallback((id: string) => {
    persistContacts(contacts.filter(c => c.id !== id));
    // Clean up related data
    const newInteractions = interactions.filter(i => i.contactId !== id);
    setInteractions(newInteractions);
    saveInteractions(newInteractions);
    const newCommitments = commitments.filter(c => c.contactId !== id);
    setCommitments(newCommitments);
    saveCommitments(newCommitments);
    const newGoals = relationshipGoals.filter(g => g.contactId !== id);
    setRelationshipGoals(newGoals);
    saveRelationshipGoals(newGoals);
  }, [contacts, interactions, commitments, relationshipGoals, persistContacts]);

  // --- Interactions CRUD ---

  const addInteraction = useCallback((data: {
    contactId: string;
    type: InteractionType;
    durationMinutes?: number;
    energyAfter?: 1 | 2 | 3 | 4 | 5;
    note?: string;
    date?: string;
  }) => {
    const interaction: Interaction = {
      id: generateId(),
      contactId: data.contactId,
      date: data.date || new Date().toISOString(),
      type: data.type,
      durationMinutes: data.durationMinutes,
      energyAfter: data.energyAfter,
      note: data.note,
    };
    const updated = [interaction, ...interactions];
    setInteractions(updated);
    saveInteractions(updated);
    return interaction;
  }, [interactions]);

  const deleteInteraction = useCallback((id: string) => {
    const updated = interactions.filter(i => i.id !== id);
    setInteractions(updated);
    saveInteractions(updated);
  }, [interactions]);

  const getInteractionsForContact = useCallback((contactId: string) =>
    interactions.filter(i => i.contactId === contactId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [interactions]);

  // --- Commitments CRUD ---

  const addCommitment = useCallback((data: {
    contactId: string;
    text: string;
    dueDate?: string;
    recurring?: 'weekly' | 'biweekly' | 'monthly';
  }) => {
    const commitment: Commitment = { id: generateId(), ...data };
    const updated = [commitment, ...commitments];
    setCommitments(updated);
    saveCommitments(updated);
    return commitment;
  }, [commitments]);

  const completeCommitment = useCallback((id: string) => {
    const updated = commitments.map(c =>
      c.id === id ? { ...c, completedAt: new Date().toISOString() } : c
    );
    setCommitments(updated);
    saveCommitments(updated);
  }, [commitments]);

  const uncompleteCommitment = useCallback((id: string) => {
    const updated = commitments.map(c =>
      c.id === id ? { ...c, completedAt: undefined } : c
    );
    setCommitments(updated);
    saveCommitments(updated);
  }, [commitments]);

  const deleteCommitment = useCallback((id: string) => {
    const updated = commitments.filter(c => c.id !== id);
    setCommitments(updated);
    saveCommitments(updated);
  }, [commitments]);

  const getCommitmentsForContact = useCallback((contactId: string) =>
    commitments.filter(c => c.contactId === contactId),
  [commitments]);

  // --- Relationship Goals CRUD ---

  const addRelationshipGoal = useCallback((data: {
    contactId: string;
    text: string;
    targetDate?: string;
  }) => {
    const goal: RelationshipGoal = { id: generateId(), ...data };
    const updated = [goal, ...relationshipGoals];
    setRelationshipGoals(updated);
    saveRelationshipGoals(updated);
    return goal;
  }, [relationshipGoals]);

  const completeRelationshipGoal = useCallback((id: string) => {
    const updated = relationshipGoals.map(g =>
      g.id === id ? { ...g, completedAt: new Date().toISOString() } : g
    );
    setRelationshipGoals(updated);
    saveRelationshipGoals(updated);
  }, [relationshipGoals]);

  const deleteRelationshipGoal = useCallback((id: string) => {
    const updated = relationshipGoals.filter(g => g.id !== id);
    setRelationshipGoals(updated);
    saveRelationshipGoals(updated);
  }, [relationshipGoals]);

  const getRelationshipGoalsForContact = useCallback((contactId: string) =>
    relationshipGoals.filter(g => g.contactId === contactId),
  [relationshipGoals]);

  // --- Derived Data ---

  const getLastInteraction = useCallback((contactId: string): Interaction | null => {
    const contactInteractions = interactions.filter(i => i.contactId === contactId);
    if (contactInteractions.length === 0) return null;
    return contactInteractions.reduce((latest, i) =>
      new Date(i.date) > new Date(latest.date) ? i : latest
    );
  }, [interactions]);

  const getDaysSinceLastInteraction = useCallback((contactId: string): number | null => {
    const last = getLastInteraction(contactId);
    if (!last) return null;
    const diff = Date.now() - new Date(last.date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [getLastInteraction]);

  const getStreakStatus = useCallback((contact: Contact): 'on-track' | 'due-soon' | 'overdue' | 'no-goal' => {
    if (!contact.interactionGoalDays) return 'no-goal';
    const daysSince = getDaysSinceLastInteraction(contact.id);
    if (daysSince === null) return 'overdue'; // never interacted
    if (daysSince > contact.interactionGoalDays) return 'overdue';
    if (daysSince >= contact.interactionGoalDays * 0.75) return 'due-soon';
    return 'on-track';
  }, [getDaysSinceLastInteraction]);

  const activeCommitments = useMemo(() =>
    commitments.filter(c => !c.completedAt)
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }),
  [commitments]);

  const overdueCommitments = useMemo(() =>
    activeCommitments.filter(c =>
      c.dueDate && new Date(c.dueDate) < new Date()
    ),
  [activeCommitments]);

  const contactsByRing = useMemo(() => {
    const rings: Record<CircleRing, Contact[]> = { core: [], close: [], extended: [], distant: [] };
    contacts.forEach(c => rings[c.circleRing].push(c));
    return rings;
  }, [contacts]);

  return {
    // Data
    contacts,
    interactions,
    commitments,
    relationshipGoals,
    activeCommitments,
    overdueCommitments,
    contactsByRing,

    // Contact CRUD
    addContact,
    updateContact,
    deleteContact,

    // Interactions
    addInteraction,
    deleteInteraction,
    getInteractionsForContact,
    getLastInteraction,
    getDaysSinceLastInteraction,
    getStreakStatus,

    // Commitments
    addCommitment,
    completeCommitment,
    uncompleteCommitment,
    deleteCommitment,
    getCommitmentsForContact,

    // Relationship Goals
    addRelationshipGoal,
    completeRelationshipGoal,
    deleteRelationshipGoal,
    getRelationshipGoalsForContact,
  };
}
