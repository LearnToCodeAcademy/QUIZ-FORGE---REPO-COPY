import React, { useEffect, useState, useRef } from "react";

interface Props {
  targetRef: React.RefObject<HTMLElement | null>;
  onDismiss: () => void;
}

export default function StarTutorial({ targetRef, onDismiss }: Props) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const arrowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePos = () => {
      if (targetRef.current) {
        const rect = targetRef.current.getBoundingClientRect();
        setPos({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
        setVisible(true);
      }
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, [targetRef]);

  useEffect(() => {
    const handleClick = () => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    };
    if (visible) {
      document.addEventListener("click", handleClick);
    }
    return () => document.removeEventListener("click", handleClick);
  }, [visible, onDismiss]);

  if (!visible) return null;

  const spotlightSize = window.innerWidth < 768 ? 80 : 100;

  return (
    <div className="star-tutorial-overlay">
      <svg className="star-tutorial-mask" width="100%" height="100%">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <circle cx={pos.x} cy={pos.y} r={spotlightSize} fill="black" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      <div
        className="star-tutorial-clickme"
        style={{ left: pos.x, top: pos.y - spotlightSize - 10 }}
      >
        Click me!
      </div>

      <div
        ref={arrowRef}
        className="star-tutorial-arrow"
        style={{ left: pos.x, top: pos.y - 50 }}
      >
        <svg width="24" height="30" viewBox="0 0 24 30" className="arrow-cursor-svg">
          <path
            d="M5 2 L5 22 L10 17 L15 25 L18 23 L13 15 L20 15 Z"
            fill="white"
            stroke="#333"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  );
}
