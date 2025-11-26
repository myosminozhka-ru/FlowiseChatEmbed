import { JSX } from 'solid-js/jsx-runtime';

export const CheckIcon = (props: JSX.SvgSVGAttributes<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="35" viewBox="0 0 48 35" fill={props.color ?? 'currentColor'} {...props}>
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M4.55228 16.781C3.51089 15.7396 1.82245 15.7396 0.781049 16.781C-0.26035 17.8224 -0.26035 19.5109 0.781049 20.5523L14.1144 33.8856C15.1558 34.927 16.8442 34.927 17.8856 33.8856L47.219 4.55229C48.2603 3.51089 48.2603 1.82245 47.219 0.781049C46.1776 -0.26035 44.4891 -0.26035 43.4477 0.781049L16 28.2288L4.55228 16.781Z"
    />
  </svg>
);
