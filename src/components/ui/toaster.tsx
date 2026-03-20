import { Toaster as SileoToaster } from 'sileo';

export function Toaster() {
  return (
    <SileoToaster
      position="top-center"
      offset={{ top: 20, right: 16, left: 16 }}
      theme="light"
      options={{
        roundness: 22,
      }}
    />
  );
}
