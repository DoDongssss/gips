export function FieldError({ message }: { message?: string }) {
    return message ? <p className="text-destructive text-sm">{message}</p> : null;
}