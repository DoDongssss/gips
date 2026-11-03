let live = false;

/** Set by the register header while its live connection is up. */
export const setPosLive = (value: boolean): void => {
    live = value;
};

/**
 * For a query's refetchInterval: check often while there is no live connection (`fast`),
 * and only now and then as a safety net while there is one (`slow`).
 */
export const posPollMs =
    (fast: number, slow = 60_000) =>
    (): number =>
        live ? slow : fast;
