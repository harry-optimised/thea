import React, {useCallback} from "react";

import styles from "./Button.module.css";

interface Props {
  text: string;
}

export function Button({ text }: Props) {

    const handleClick = useCallback(() => {

    }, [])

  return (
    <div className={styles.circleContainer}>
      <div className={styles.circle}>
        <h1>{text}</h1>
      </div>
    </div>
  );
}
