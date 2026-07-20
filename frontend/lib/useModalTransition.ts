import { useState } from "react";

export function useModalTransition(onClose: () => void, duration = 150) {
  const [closing, setClosing] = useState(false);

  const requestClose = () => {
    setClosing(true);
    setTimeout(onClose, duration);
  };

  return { closing, requestClose };
}
