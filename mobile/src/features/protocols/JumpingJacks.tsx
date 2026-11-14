import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { color, font, radius, space } from '../../theme';
import { Press } from '../../components/ui/Press';

/** Figura de palo que abre y cierra cada medio segundo; una repetición por apertura. */
export function JumpingJacks() {
  const [open, setOpen] = useState(false);
  const [reps, setReps] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setOpen((o) => {
        if (!o) setReps((r) => r + 1);
        return !o;
      });
    }, 500);
    return () => clearInterval(id);
  }, [running]);
  const arm = open ? 20 : -20;
  const leg = open ? 14 : -10;
  return (
    <View style={{ alignItems: 'center', gap: space.md }}>
      <Svg width={160} height={180} viewBox="0 0 160 180">
        <Circle cx={80} cy={28} r={14} fill={color.text} />
        <Line x1={80} y1={44} x2={80} y2={110} stroke={color.text} strokeWidth={6} strokeLinecap="round" />
        <Line x1={80} y1={60} x2={30} y2={60 + arm} stroke={color.text} strokeWidth={6} strokeLinecap="round" />
        <Line x1={80} y1={60} x2={130} y2={60 + arm} stroke={color.text} strokeWidth={6} strokeLinecap="round" />
        <Line x1={80} y1={110} x2={50} y2={170 + leg / 2} stroke={color.text} strokeWidth={6} strokeLinecap="round" />
        <Line x1={80} y1={110} x2={110} y2={170 + leg / 2} stroke={color.text} strokeWidth={6} strokeLinecap="round" />
      </Svg>
      <Text style={font('figure')}>{reps}</Text>
      <Press label={running ? 'Pausar' : 'Empezar'} onPress={() => setRunning((r) => !r)} style={{ backgroundColor: color.raised, borderRadius: radius.md, paddingHorizontal: space.xl, paddingVertical: space.md }}>
        <Text style={font('button')}>{running ? 'Pausar' : 'Empezar'}</Text>
      </Press>
    </View>
  );
}
