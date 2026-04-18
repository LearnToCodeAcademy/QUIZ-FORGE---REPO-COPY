import React, { useEffect } from "react";

interface Props {
  message: string;
  type: "error" | "success" | "info";
  onClose: () => void;
}

export default function Notification({ message, type, onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons: Record<string, string> = {
    error: "⚠",
    success: "✓",
    info: "ℹ"
  };

  return (
    <div className={`notification notification-${type}`} onClick={onClose}>
      <span className="notification-icon">{icons[type]}</span>
      <span className="notification-text">{message}</span>
      <button className="notification-close">✕</button>
    </div>
  );
}
