import { useState, useEffect, useRef } from "react";

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

const Pupil = ({ 
  size = 12, 
  maxDistance = 5,
  pupilColor = "black",
  forceLookX,
  forceLookY
}: PupilProps) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calculatePosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }
    const rect = pupilRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = mouseX - cx;
    const dy = mouseY - cy;
    const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
    const angle = Math.atan2(dy, dx);
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
  };

  const pos = calculatePosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: size, height: size,
        backgroundColor: pupilColor,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    />
  );
};

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

const EyeBall = ({ 
  size = 48, pupilSize = 16, maxDistance = 10,
  eyeColor = "white", pupilColor = "black",
  isBlinking = false, forceLookX, forceLookY
}: EyeBallProps) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calculatePosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }
    const rect = eyeRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = mouseX - cx;
    const dy = mouseY - cy;
    const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
    const angle = Math.atan2(dy, dx);
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
  };

  const pos = calculatePosition();

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{
        width: size, height: isBlinking ? 2 : size,
        backgroundColor: eyeColor, overflow: 'hidden',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: pupilSize, height: pupilSize,
            backgroundColor: pupilColor,
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
    </div>
  );
};

// Hook for random blinking
function useBlinking() {
  const [isBlinking, setIsBlinking] = useState(false);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => { setIsBlinking(false); schedule(); }, 150);
      }, Math.random() * 4000 + 3000);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, []);
  return isBlinking;
}

interface AnimatedCharactersProps {
  isTyping: boolean;
  showPassword: boolean;
  hasPassword: boolean;
}

export const AnimatedCharacters = ({ isTyping, showPassword, hasPassword }: AnimatedCharactersProps) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);

  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  const isPurpleBlinking = useBlinking();
  const isBlackBlinking = useBlinking();

  const passwordVisible = hasPassword && showPassword;
  const passwordHidden = hasPassword && !showPassword;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const timer = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(timer);
    }
    setIsLookingAtEachOther(false);
  }, [isTyping]);

  useEffect(() => {
    if (passwordVisible) {
      const timeout = setTimeout(() => {
        setIsPurplePeeking(true);
        setTimeout(() => setIsPurplePeeking(false), 800);
      }, Math.random() * 3000 + 2000);
      return () => clearTimeout(timeout);
    }
    setIsPurplePeeking(false);
  }, [passwordVisible, isPurplePeeking]);

  const calcPos = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 3;
    const dx = mouseX - cx;
    const dy = mouseY - cy;
    return {
      faceX: Math.max(-15, Math.min(15, dx / 20)),
      faceY: Math.max(-10, Math.min(10, dy / 30)),
      bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
    };
  };

  const pp = calcPos(purpleRef);
  const bp = calcPos(blackRef);
  const yp = calcPos(yellowRef);
  const op = calcPos(orangeRef);

  return (
    <div className="relative flex items-end justify-center h-[500px]">
      <div className="relative" style={{ width: 550, height: 400 }}>
        {/* Purple - tallest, back */}
        <div
          ref={purpleRef}
          className="absolute bottom-0 transition-all duration-700 ease-in-out"
          style={{
            left: 70, width: 180,
            height: (isTyping || passwordHidden) ? 440 : 400,
            backgroundColor: 'hsl(var(--primary))',
            borderRadius: '10px 10px 0 0',
            zIndex: 1,
            transform: passwordVisible ? 'skewX(0deg)'
              : (isTyping || passwordHidden) ? `skewX(${(pp.bodySkew) - 12}deg) translateX(40px)`
              : `skewX(${pp.bodySkew}deg)`,
            transformOrigin: 'bottom center',
          }}
        >
          <div
            className="absolute flex gap-8 transition-all duration-700 ease-in-out"
            style={{
              left: passwordVisible ? 20 : isLookingAtEachOther ? 55 : 45 + pp.faceX,
              top: passwordVisible ? 35 : isLookingAtEachOther ? 65 : 40 + pp.faceY,
            }}
          >
            <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="hsl(var(--foreground))" isBlinking={isPurpleBlinking}
              forceLookX={passwordVisible ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
              forceLookY={passwordVisible ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
            />
            <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="hsl(var(--foreground))" isBlinking={isPurpleBlinking}
              forceLookX={passwordVisible ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
              forceLookY={passwordVisible ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
            />
          </div>
        </div>

        {/* Black - middle */}
        <div
          ref={blackRef}
          className="absolute bottom-0 transition-all duration-700 ease-in-out"
          style={{
            left: 240, width: 120, height: 310,
            backgroundColor: 'hsl(var(--foreground))',
            borderRadius: '8px 8px 0 0',
            zIndex: 2,
            transform: passwordVisible ? 'skewX(0deg)'
              : isLookingAtEachOther ? `skewX(${bp.bodySkew * 1.5 + 10}deg) translateX(20px)`
              : (isTyping || passwordHidden) ? `skewX(${bp.bodySkew * 1.5}deg)`
              : `skewX(${bp.bodySkew}deg)`,
            transformOrigin: 'bottom center',
          }}
        >
          <div
            className="absolute flex gap-6 transition-all duration-700 ease-in-out"
            style={{
              left: passwordVisible ? 10 : isLookingAtEachOther ? 32 : 26 + bp.faceX,
              top: passwordVisible ? 28 : isLookingAtEachOther ? 12 : 32 + bp.faceY,
            }}
          >
            <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="hsl(var(--foreground))" isBlinking={isBlackBlinking}
              forceLookX={passwordVisible ? -4 : isLookingAtEachOther ? 0 : undefined}
              forceLookY={passwordVisible ? -4 : isLookingAtEachOther ? -4 : undefined}
            />
            <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="hsl(var(--foreground))" isBlinking={isBlackBlinking}
              forceLookX={passwordVisible ? -4 : isLookingAtEachOther ? 0 : undefined}
              forceLookY={passwordVisible ? -4 : isLookingAtEachOther ? -4 : undefined}
            />
          </div>
        </div>

        {/* Orange semi-circle - front left */}
        <div
          ref={orangeRef}
          className="absolute bottom-0 transition-all duration-700 ease-in-out"
          style={{
            left: 0, width: 240, height: 200,
            zIndex: 3,
            backgroundColor: '#FF9B6B',
            borderRadius: '120px 120px 0 0',
            transform: passwordVisible ? 'skewX(0deg)' : `skewX(${op.bodySkew}deg)`,
            transformOrigin: 'bottom center',
          }}
        >
          <div
            className="absolute flex gap-8 transition-all duration-200 ease-out"
            style={{
              left: passwordVisible ? 50 : 82 + op.faceX,
              top: passwordVisible ? 85 : 90 + op.faceY,
            }}
          >
            <Pupil size={12} maxDistance={5} pupilColor="hsl(var(--foreground))" forceLookX={passwordVisible ? -5 : undefined} forceLookY={passwordVisible ? -4 : undefined} />
            <Pupil size={12} maxDistance={5} pupilColor="hsl(var(--foreground))" forceLookX={passwordVisible ? -5 : undefined} forceLookY={passwordVisible ? -4 : undefined} />
          </div>
        </div>

        {/* Yellow tall - front right */}
        <div
          ref={yellowRef}
          className="absolute bottom-0 transition-all duration-700 ease-in-out"
          style={{
            left: 310, width: 140, height: 230,
            backgroundColor: '#E8D754',
            borderRadius: '70px 70px 0 0',
            zIndex: 4,
            transform: passwordVisible ? 'skewX(0deg)' : `skewX(${yp.bodySkew}deg)`,
            transformOrigin: 'bottom center',
          }}
        >
          <div
            className="absolute flex gap-6 transition-all duration-200 ease-out"
            style={{
              left: passwordVisible ? 20 : 52 + yp.faceX,
              top: passwordVisible ? 35 : 40 + yp.faceY,
            }}
          >
            <Pupil size={12} maxDistance={5} pupilColor="hsl(var(--foreground))" forceLookX={passwordVisible ? -5 : undefined} forceLookY={passwordVisible ? -4 : undefined} />
            <Pupil size={12} maxDistance={5} pupilColor="hsl(var(--foreground))" forceLookX={passwordVisible ? -5 : undefined} forceLookY={passwordVisible ? -4 : undefined} />
          </div>
          <div
            className="absolute w-20 h-[4px] rounded-full transition-all duration-200 ease-out"
            style={{
              backgroundColor: 'hsl(var(--foreground))',
              left: passwordVisible ? 10 : 40 + yp.faceX,
              top: passwordVisible ? 88 : 88 + yp.faceY,
            }}
          />
        </div>
      </div>
    </div>
  );
};
