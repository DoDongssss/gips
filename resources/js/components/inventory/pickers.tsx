import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { IngredientOption, Unit } from '@/types/inventory';

type IngredientSelectProps = {
    value: string;
    onChange: (value: string) => void;
    ingredients: IngredientOption[];
    label: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
};

export function IngredientSelect({ value, onChange, ingredients, label, placeholder = 'Ingredient', disabled, className }: IngredientSelectProps) {
    return (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger aria-label={label} className={className ?? 'w-52'}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {ingredients.map((ingredient) => (
                    <SelectItem key={ingredient.id} value={String(ingredient.id)}>
                        {ingredient.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

type UnitSelectProps = {
    value: string;
    onChange: (value: string) => void;
    units: Unit[];
    label?: string;
    disabled?: boolean;
    className?: string;
};

export function UnitSelect({ value, onChange, units, label = 'Unit', disabled, className }: UnitSelectProps) {
    return (
        <Select value={value} onValueChange={onChange} disabled={disabled || units.length === 0}>
            <SelectTrigger aria-label={label} className={className ?? 'w-28'}>
                <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
                {units.map((unit) => (
                    <SelectItem key={unit.id} value={String(unit.id)}>
                        {unit.abbreviation}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
