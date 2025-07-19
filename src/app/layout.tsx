import type { Metadata } from "next";
import { Noto_Sans_JP } from 'next/font/google';
import "./globals.css"; //apply style
import React from 'react'

import Provider from './provider';

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'azuret.net',
  description: "A website created by Azuret.",
  openGraph: {
    title: "azuret.net",
    description: "A website created by Azuret.",
    locale: 'ja-JP',
    type: 'website',
  },
};


const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang='ja'>
      <meta name="theme-color" content="#ffbd43"></meta>
      <link rel="icon" href="/favicon.ico" />
      <body className={`${notoSansJp.className} antialiased`}>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}

export default RootLayout