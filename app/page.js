import dynamic from 'next/dynamic';

const PencilDrawWorkspace = dynamic(
  () => import('../components/PencilDrawWorkspace'),
  { ssr: false }
);

export default function Home() {
  return <PencilDrawWorkspace />;
}
