import Image from "next/image";
import Link from "next/link";

const Home = () => {
  return (
    <div className="w-full  h-screen flex items-center justify-center bg-white">
      <div className="relative w-full h-screen">
        <Image
          src="/images/bg.png"
          alt="Background Image"
          width={1920}
          height={1080}
          className="w-full h-auto absolute inset-0"
          priority
        />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center lg:mt-72 gap-8">
        <h1 className="text-4xl md:text-7xl font-bold text-gray-900">
          Selamat Datang di AFDYL
        </h1>

        <p className="text-sm md:text-xl font-normal text-gray-700 max-w-3xl">
          Lorem ipsum dolor sit amet consectetur. Diam faucibus in adipiscing
          metus posuere pretium commodo.
        </p>

        <Link href={'/dashboard'} className="bg-brown-brand text-xl tracking-wide hover:opacity-90 duration-200 font-bold text-white px-8 py-3 rounded-full">
          Mulai Belajar
        </Link>
      </div>
    </div>
  );
};

export default Home;
