import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../components/ui/select';
import { SkillLevel } from '../../types/worker.types';

interface SkillLevelSelectProps {
  value: SkillLevel;
  onChange: (val: SkillLevel) => void;
  tradeName: string;
}

export const SkillLevelSelect: React.FC<SkillLevelSelectProps> = ({ value, onChange, tradeName }) => {
  return (
    <Select value={value} onValueChange={(val: SkillLevel) => onChange(val)}>
      <SelectTrigger className="w-[130px]" aria-label={`Skill level for ${tradeName}`}>
        <SelectValue placeholder="Select Level" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="junior">Junior</SelectItem>
        <SelectItem value="mid">Mid-level</SelectItem>
        <SelectItem value="senior">Senior</SelectItem>
      </SelectContent>
    </Select>
  );
};