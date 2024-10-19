import { FadeUpDiv, FadeUpStagger } from '@/components/animation';
//import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';
import {
  FaBirthdayCake,
  FaLocationArrow,
  FaUserGraduate,
} from 'react-icons/fa';

//<div className='flex h-16 items-center justify-end'>
//<ThemeToggle />
//</div>
export default function Home() {
  return (
    <main className='container space-y-6 py-6 lg:my-10'>
      <FadeUpStagger> 
        <div className='grid grid-cols-12 grid-rows-3 gap-5 lg:gap-6'>
          <FadeUpDiv className='col-span-12 row-span-3 space-y-5 md:space-y-7 lg:col-span-4 lg:space-y-8'>
            <Image
              className='pointer-events-none w-[150px] rounded-full shadow-xl lg:w-[200px]'
              src="/azure.png"
              alt="nonick's avatar"
            />
            <section>
              <h1 className='text-3xl font-black lg:text-4xl'>NoNICK</h1>
              <h2 className='text-lg text-muted-foreground lg:text-xl'>
                なんちゃってコンテンツクリエイター
              </h2>
            </section>
            <div className='grid gap-1'>
              <div className='flex items-center gap-2 text-muted-foreground'>
                <FaBirthdayCake />
                <p>200X年10月17日</p>
              </div>
              <div className='flex items-center gap-2 text-muted-foreground'>
                <FaLocationArrow />
                <p>日本 / Japan</p>
              </div>
              <div className='flex items-center gap-2 text-muted-foreground'>
                <FaUserGraduate />
                <p>学生</p>
              </div>
            </div>
          </FadeUpDiv>
        </div>
      </FadeUpStagger>
    </main>
  );
}