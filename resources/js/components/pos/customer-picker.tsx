import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

export type CustomerOption = {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    loyalty_points: number;
};

type Props = {
    name: string;
    phone: string;
    customerId: number | null;
    loyaltyEnabled: boolean;
    onChange: (value: { customerId: number | null; name: string; phone: string; loyaltyPoints: number | null }) => void;
};

export function CustomerPicker({ name, phone, customerId, loyaltyEnabled, onChange }: Props) {
    const [search, setSearch] = useState('');
    const [draftName, setDraftName] = useState(name);
    const [draftPhone, setDraftPhone] = useState(phone);
    const queryClient = useQueryClient();

    useEffect(() => {
        setDraftName(name);
        setDraftPhone(phone);
    }, [name, phone, customerId]);

    const searchQuery = useQuery({
        queryKey: ['pos', 'customers', search],
        queryFn: async () => {
            const params = new URLSearchParams();

            if (search.trim()) {
                params.set('q', search.trim());
            }

            return api<{ data: CustomerOption[] }>(`/api/v1/customers?${params.toString()}`);
        },
        enabled: search.trim().length >= 2,
        staleTime: 30_000,
    });

    const selected = useMemo(
        () => searchQuery.data?.data.find((row) => row.id === customerId) ?? null,
        [searchQuery.data, customerId],
    );

    const register = useMutation({
        mutationFn: async () =>
            api<{ data: CustomerOption }>('/api/v1/customers', {
                method: 'POST',
                body: {
                    name: draftName.trim(),
                    phone: draftPhone.trim() || null,
                    email: null,
                },
            }),
        onSuccess: (response) => {
            const row = response.data;
            setSearch('');
            onChange({
                customerId: row.id,
                name: row.name,
                phone: row.phone ?? draftPhone,
                loyaltyPoints: row.loyalty_points,
            });
            queryClient.invalidateQueries({ queryKey: ['pos', 'customers'] });
            toast.success(`${row.name} was saved.`);
        },
        onError: () => toast.error('Could not save the customer.'),
    });

    function selectCustomer(row: CustomerOption) {
        setSearch('');
        setDraftName(row.name);
        setDraftPhone(row.phone ?? '');
        onChange({
            customerId: row.id,
            name: row.name,
            phone: row.phone ?? '',
            loyaltyPoints: row.loyalty_points,
        });
    }

    function updateName(value: string) {
        setDraftName(value);
        if (customerId) {
            onChange({ customerId, name: value, phone: draftPhone, loyaltyPoints: selected?.loyalty_points ?? null });
        } else {
            onChange({ customerId: null, name: value, phone: draftPhone, loyaltyPoints: null });
        }
    }

    function updatePhone(value: string) {
        setDraftPhone(value);
        onChange({
            customerId,
            name: draftName,
            phone: value,
            loyaltyPoints: selected?.loyalty_points ?? null,
        });
    }

    const canRegister = draftName.trim().length >= 2 && !customerId;

    return (
        <div className="space-y-3 rounded-lg border p-3">
            <div className="space-y-1">
                <Label htmlFor="pos-customer-search">Customer (optional)</Label>
                <Input
                    id="pos-customer-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search saved customers (2+ characters)"
                    autoComplete="off"
                />
            </div>

            {searchQuery.data && searchQuery.data.data.length > 0 && search.trim().length >= 2 && (
                <ul className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-1">
                    {searchQuery.data.data.map((row) => (
                        <li key={row.id}>
                            <Button type="button" variant="ghost" className="h-auto w-full justify-start px-2 py-1.5 text-left text-sm" onClick={() => selectCustomer(row)}>
                                <span className="font-medium">{row.name}</span>
                                {row.phone && <span className="text-muted-foreground ml-2">{row.phone}</span>}
                                {loyaltyEnabled && <span className="text-muted-foreground ml-auto tabular-nums">{row.loyalty_points} pts</span>}
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                    <Label htmlFor="pos-customer-name">Name on order</Label>
                    <Input id="pos-customer-name" value={draftName} onChange={(event) => updateName(event.target.value)} autoComplete="off" />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="pos-customer-phone">Mobile number</Label>
                    <Input
                        id="pos-customer-phone"
                        value={draftPhone}
                        onChange={(event) => updatePhone(event.target.value)}
                        placeholder="Links loyalty"
                        inputMode="tel"
                        autoComplete="off"
                    />
                </div>
            </div>

            {customerId && (
                <p className="text-muted-foreground text-xs">
                    Linked to customer #{customerId}
                    {loyaltyEnabled && selected && ` · ${selected.loyalty_points} point(s) available`}
                </p>
            )}

            {canRegister && (
                <Button type="button" variant="outline" size="sm" disabled={register.isPending} onClick={() => register.mutate()}>
                    {register.isPending ? 'Saving…' : 'Save as new customer'}
                </Button>
            )}
        </div>
    );
}
