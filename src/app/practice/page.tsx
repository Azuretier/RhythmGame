import { FadeUpCard, FadeUpDiv, FadeUpStagger } from '@/components/animation';
import { CardIcon } from '@/components/link-card-icon';
import { CardName } from '@/components/link-card-name';
import { LinkCard } from '@/components/link-card';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';
import {
  FaBirthdayCake,
  FaLocationArrow,
  FaSteam,
  FaUserGraduate,
  FaXbox,
  FaYoutube,
} from 'react-icons/fa';

export default function Home() {
  return (
    <main className='container space-y-6 py-6 lg:my-10'>
      <FadeUpStagger>
        <div className='flex h-16 items-center justify-end'>
          <ThemeToggle />
        </div>
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
          <LinkCard
            className='col-span-12 grid gap-3 p-6 transition-colors hover:border-youtube md:col-span-6 lg:col-span-4'
            href='https://youtube.com/nonick_mc'
          >
            <CardIcon className='bg-youtube'>
              <FaYoutube size={25} />
            </CardIcon>
            <CardName name='YouTube' id='@nonick_mc' />
          </LinkCard>
          <FadeUpCard className='col-span-6 grid gap-3 p-6 transition-colors hover:border-xbox md:col-span-3 lg:col-span-2'>
            <CardIcon className='bg-xbox'>
              <FaXbox size={25} />
            </CardIcon>
            <CardName name='Xbox' id='NULL1017' />
          </FadeUpCard>
          <LinkCard
            className='col-span-6 grid gap-3 p-6 transition-colors hover:border-steam md:col-span-3 lg:col-span-2'
            href='https://steamcommunity.com/id/nonick-mc/'
          >
            <CardIcon className='bg-steam'>
              <FaSteam size={25} />
            </CardIcon>
            <CardName name='Steam' id='NULL1017' />
          </LinkCard>
          
          
        </div>
      </FadeUpStagger>
    </main>
  );
}