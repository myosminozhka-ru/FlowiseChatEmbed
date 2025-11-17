import { JSX } from 'solid-js/jsx-runtime';
export const SendIcon = (props: JSX.SvgSVGAttributes<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 22" fill={props.color ?? 'currentColor'} {...props}>
    <path d="M21.4,10L1.7,0.1c-1-0.4-2.1,0.4-1.6,1.4l2.6,7C2.8,8.8,3,9,3.3,9l12.1,2l-12.1,2c-0.3,0-0.5,0.2-0.6,0.5 l-2.6,7c-0.3,1,0.7,1.9,1.6,1.3l19.7-9.9C22.2,11.6,22.2,10.5,21.4,10z" />
  </svg>
);
