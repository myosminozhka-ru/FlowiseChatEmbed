import { JSX } from 'solid-js/jsx-runtime';
const defaultButtonColor = '#3B81F6';
export const MenuIcon = (props: JSX.SvgSVGAttributes<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    stroke-width="2"
    stroke={props.color ?? defaultButtonColor}
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M5 17L19 17M5 12H19M5 7L13 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);
