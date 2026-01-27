import { JSX } from 'solid-js/jsx-runtime';
const defaultButtonColor = '#3B81F6';
export const ExpandIcon = (props: JSX.SvgSVGAttributes<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke-width="2"
    stroke={props.color ?? defaultButtonColor}
    stroke-linecap="round"
    stroke-linejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M10 19H5V14M14 5H19V10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);
