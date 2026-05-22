import React, { useState } from 'react';
import { TalentPoolEmptyState } from '../../components/hr/TalentPoolEmptyState';
import { TalentPoolList } from '../../components/hr/TalentPoolList';
import { AddTalentModal } from '../../components/hr/AddTalentModal';

export function HRTalentPools() {
  const [hasTalent, setHasTalent] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddTalentSuccess = () => {
    // Switch view to the list populated with candidates after "adding" talent
    setHasTalent(true);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background relative overflow-hidden">
      {!hasTalent ? (
        <TalentPoolEmptyState onAddTalent={() => setIsModalOpen(true)} />
      ) : (
        <TalentPoolList onAddTalent={() => setIsModalOpen(true)} />
      )}

      <AddTalentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAddSuccess={handleAddTalentSuccess}
      />
    </div>
  );
}
