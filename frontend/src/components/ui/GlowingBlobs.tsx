import { motion } from "framer-motion";

export function GlowingBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-30">
      {/* Primary Blob */}
      <motion.div
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px]"
        animate={{
          x: ["0%", "20%", "0%"],
          y: ["0%", "30%", "0%"],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      {/* Secondary Blob */}
      <motion.div
        className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-secondary/30 blur-[150px]"
        animate={{
          x: ["0%", "-30%", "0%"],
          y: ["0%", "-20%", "0%"],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Accent Blob */}
      <motion.div
        className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] rounded-full bg-primary/10 blur-[100px]"
        animate={{
          x: ["0%", "50%", "0%"],
          y: ["0%", "-40%", "0%"],
          scale: [0.8, 1.1, 0.8],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
