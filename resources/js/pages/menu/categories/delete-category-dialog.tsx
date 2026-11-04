import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Props = {
    open: boolean;
    name: string | null;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function DeleteCategoryDialog({ open, name, onOpenChange, onConfirm }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete category</DialogTitle>
                    <DialogDescription>
                        {name ? (
                            <>
                                Delete &ldquo;{name}&rdquo;? It must have no products. You can restore deleted categories later.
                            </>
                        ) : (
                            'Delete this category?'
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
