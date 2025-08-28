import React, { useEffect, useState } from "react";

export default function Timer({ entryTime, exitTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = exitTime ? new Date(exitTime) : new Date();
      const start = new Date(entryTime);
      setElapsed(Math.floor((now - start) / 60000)); // minutes
    }, 1000);

    return () => clearInterval(interval);
  }, [entryTime, exitTime]);

  const hours = Math.floor(elapsed / 60);
  const minutes = elapsed % 60;

  return (
    <span>
      {hours} soat {minutes} daqiqa
    </span>
  );
}
