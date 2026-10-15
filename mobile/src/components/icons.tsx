import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  color: ColorValue;
  size?: number;
}

/** Three small icons for the tabs, drawn here because there is no icon package. They are decoration: the tabs have names. */
export function ListIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Rect x="4" y="5" width="16" height="3" rx="1.5" fill={color} />
      <Rect x="4" y="10.5" width="16" height="3" rx="1.5" fill={color} />
      <Rect x="4" y="16" width="10" height="3" rx="1.5" fill={color} />
    </Svg>
  );
}

export function ChartIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d="M4 6 L10 12 L14 9 L20 17"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M4 20 H20" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function GearIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth="2.2" fill="none" />
      <Path
        d="M12 3 V6 M12 18 V21 M3 12 H6 M18 12 H21 M5.6 5.6 L7.7 7.7 M16.3 16.3 L18.4 18.4 M18.4 5.6 L16.3 7.7 M7.7 16.3 L5.6 18.4"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}
