import { FadeUpDiv, FadeUpStagger } from '@/components/animation';
import Image from "next/image";

export default function Home() {
  return (
    <FadeUpStagger>
        <FadeUpDiv className="flex items-center justify-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-slate-900">
        
            <div className="shrink-0">
                <Image className="size-24" src="/azure.webp" width={800} height={800} quality={75} alt="Azure Logo"/>
            </div>
            <div>
                <div className="text-xl font-medium text-black">Azure</div>
                <p className="text-slate-500">You have a new message!</p>
            </div>
        
        </FadeUpDiv>
    </FadeUpStagger>
  );
}