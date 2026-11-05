let live = false;

/** Set by the register header while its live connection is up. */
export const setPosLive = (value: boolean): void => {
    live = value;
};

/** While Pusher is connected on the register, order lists refresh from pushes only. */
export const posPollMs =
    (fallbackMs: number) =>
    (): number | false =>
        live ? false : fallbackMs;
