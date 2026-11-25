import styles from "./assistant-robot.module.css";

export type AssistantMood = "idle" | "thinking" | "reply" | "error";

export function AssistantRobot({ mood, docked = false, unread = false, guiding = false, courier = false, resting = false, receipt = false, signal, pose }: {
  mood: AssistantMood;
  docked?: boolean;
  unread?: boolean;
  guiding?: boolean;
  courier?: boolean;
  resting?: boolean;
  receipt?: boolean;
  signal?: "network" | "expired" | "pending";
  pose?: "wave" | "scan" | "point" | "carry" | "nod";
}) {
  return (
    <span className={styles.robot} data-kona data-robot-mood={mood} data-docked={docked || undefined} data-unread={unread || undefined} data-guiding={guiding || undefined} data-courier={courier || undefined} data-resting={resting || undefined} data-receipt={receipt || undefined} data-signal={signal} data-robot-pose={pose} aria-hidden="true">
      <span className={styles.shadow} />
      <span className={styles.feet} />
      <span className={styles.body}>
        <span className={styles.arm} />
        <span className={styles.arm} />
        <span className={styles.core} />
        {receipt && <span className={styles.receipt} />}
      </span>
      <span className={styles.head}>
        <span className={styles.antenna} />
        <span className={styles.hinge} />
        <span className={styles.shell} />
        <span className={styles.visor}>
          <span className={styles.sweep} />
          <span className={styles.eyes}><span /><span /></span>
          <span className={styles.mouth} />
        </span>
      </span>
    </span>
  );
}
