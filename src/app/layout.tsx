import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css"; //apply style
import React from 'react'

import Provider from './provider';
import { VersionProvider } from '@/lib/version/context';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: 'azuret.me',
  description: "A website created by Azuret.",
  openGraph: {
    title: "azuret.me",
    description: "A website created by Azuret.",
    locale: 'ja-JP',
    type: 'website',
  },
};


const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang='ja'>
      <head>
        <meta name="theme-color" content="#ffbd43" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Zen+Kaku+Gothic+New:wght@300;400;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} style={{ overflowX: 'hidden' }}>
        <VersionProvider>
          <Provider>
            {children}
          </Provider>
        </VersionProvider>
      </body>
    </html>
  );
}

export default RootLayout