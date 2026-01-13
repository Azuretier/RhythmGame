import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css"; //apply style
import React from 'react'

import Provider from './provider';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  fallback: ["system-ui", "arial"],
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  fallback: ["monospace"],
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=VT323&display=swap" rel="stylesheet" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} style={{ fontFamily: 'Inter, system-ui, arial, sans-serif' }}>
        <Provider>
          {children}
        </Provider>
      </body>
    </html>
  );
}

export default RootLayout