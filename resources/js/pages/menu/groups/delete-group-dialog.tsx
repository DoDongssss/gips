import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Props = {
    open: boolean;
    name: string | null;
    productsCount: number;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function DeleteGroupDialog({ open, name, productsCount, onOpenChange, onConfirm }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete modifier group</DialogTitle>
                    <DialogDescription>
                        {name ? (
                            <>
                                Delete &ldquo;{name}&rdquo;?
                                {productsCount > 0 && (
                                    <> It is attached to {productsCount} product{productsCount === 1 ? '' : 's'} and will be removed from them.</>
                                )}{' '}
                                You can restore deleted groups later.
                            </>
                        ) : (
                            'Delete this modifier group?'
                        )}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" variant="destructive" onClick={onConfirm}>
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
