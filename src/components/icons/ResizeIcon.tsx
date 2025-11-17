import { JSX } from 'solid-js/jsx-runtime';
export const ResizeIcon = (props: JSX.SvgSVGAttributes<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={props.color ?? 'currentColor'}
    style={{ opacity: 0.88 }}
    {...props}
  >
    <path
      d="M5.6,11.9c0.4,0,0.6,0.3,0.6,0.6v4.3l3.8-3.8c0.3-0.3,0.7-0.3,0.9,0c0.3,0.3,0.3,0.7,0,0.9l-3.8,3.8h4.3
      c0.4,0,0.6,0.3,0.6,0.6c0,0.4-0.3,0.6-0.6,0.6H5.6C5.3,19,5,18.7,5,18.4v-5.8C5,12.2,5.3,11.9,5.6,11.9z M18.4,5
      C18.7,5,19,5.3,19,5.6v5.8c0,0.4-0.3,0.6-0.6,0.6c-0.4,0-0.6-0.3-0.6-0.6V7.2L13.9,11c-0.3,0.3-0.7,0.3-0.9,0
      c-0.3-0.3-0.3-0.7,0-0.9l3.8-3.8h-4.3c-0.4,0-0.6-0.3-0.6-0.6c0-0.4,0.3-0.6,0.6-0.6H18.4z"
    />
  </svg>
);
