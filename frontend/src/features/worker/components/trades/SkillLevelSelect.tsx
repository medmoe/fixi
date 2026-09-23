import React from 'react';
import {useTranslation} from 'react-i18next';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {type SkillLevel} from '../../types'

interface SkillLevelSelectProps {
    value: SkillLevel;
    onChange: (val: SkillLevel) => void;
    tradeName: string;
}

export const SkillLevelSelect: React.FC<SkillLevelSelectProps> = ({value, onChange, tradeName}) => {
    const {t} = useTranslation('worker');

    return (
        <Select value={value} onValueChange={(val: SkillLevel) => onChange(val)}>
            <SelectTrigger className="w-[130px]" aria-label={t('skillLevelSelect.ariaLabel', {trade: tradeName})}>
                <SelectValue placeholder={t('skillLevelSelect.selectLevel')}/>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="junior">{t('skillLevelSelect.junior')}</SelectItem>
                <SelectItem value="mid">{t('skillLevelSelect.mid')}</SelectItem>
                <SelectItem value="senior">{t('skillLevelSelect.senior')}</SelectItem>
            </SelectContent>
        </Select>
    );
};
