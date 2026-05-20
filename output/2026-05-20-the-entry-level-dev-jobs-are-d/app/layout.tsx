import './globals.css';

export const metadata = {
  title: 'TheEntryLevelDevJobsAreD',
  description: 'An app responding to: "The entry level dev jobs are disappearing."',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
