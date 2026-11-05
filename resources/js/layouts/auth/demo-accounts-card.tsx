import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type DemoAccount = {
    label: string;
    email: string;
    password: string;
};

function fillDemoCredentials(email: string, password: string): void {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (emailInput instanceof HTMLInputElement) {
        emailInput.value = email;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (passwordInput instanceof HTMLInputElement) {
        passwordInput.value = password;
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function shortLabel(label: string): string {
    return label.replace(/^Demo /, '').replace(/^Store /, '');
}

export default function DemoAccountsCard({ accounts, className }: { accounts: DemoAccount[]; className?: string }) {
    return (
        <aside
            className={cn('rounded-lg border border-border/70 bg-muted/25 px-2.5 py-2', className)}
            aria-labelledby="demo-accounts-heading"
        >
            <h2 id="demo-accounts-heading" className="text-[10px] font-medium text-muted-foreground">
                Dev logins · kitchen and bar use device pairing
            </h2>
            <ul className="mt-1">
                {accounts.map((account) => (
                    <li
                        key={account.email}
                        className="flex items-center gap-1.5 border-t border-border/50 py-1 first:border-t-0 first:pt-0"
                    >
                        <span className="w-[4.5rem] shrink-0 truncate text-[10px] font-medium text-foreground" title={account.label}>
                            {shortLabel(account.label)}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground" title={account.email}>
                            {account.email}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{account.password}</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 shrink-0 px-1.5 text-[10px] text-link hover:text-link"
                            onClick={() => fillDemoCredentials(account.email, account.password)}
                        >
                            Use
                        </Button>
                    </li>
                ))}
            </ul>
        </aside>
    );
}
