import { JSX } from 'solid-js/jsx-runtime';
export const XIcon = (props: JSX.SvgSVGAttributes<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill={props.color ?? 'currentColor'}
    opacity="0.88"
    class={`transition-colors duration-150 ${props.class || ''}`}
    {...props}
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M0.2,12.8c-0.3,0.3-0.3,0.7,0,1c0.3,0.3,0.7,0.3,1,0L7,8l5.8,5.8c0.3,0.3,0.7,0.3,1,0c0.3-0.3,0.3-0.7,0-1L8,7
	l5.8-5.8c0.3-0.3,0.3-0.7,0-1c-0.3-0.3-0.7-0.3-1,0L7,6L1.2,0.2c-0.3-0.3-0.7-0.3-1,0c-0.3,0.3-0.3,0.7,0,1L6,7L0.2,12.8z"
    />
  </svg>
);
