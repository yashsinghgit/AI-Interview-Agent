import heroImage from "../assets/hero.svg";
function Hero() {
    return (
        <section className="flex flex-col items-center justify-center text-center py-24 px-6">
            <div className="flex items-center justify-between gap-16">

             <div className="flex-[1.2]">
                 <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
                Ace Your Next Interview with AI-Powered Practice
                </h1>

               <p className="mt-5 max-w-2xl text-lg text-gray-600">
                Practice AI-powered mock interviews, receive instant feedback, and build the confidence to succeed in your next interview.
               </p>
            
               <div className="mt-8 flex gap-4">
                   <button className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition">
                        Start Interview
                   </button>

                   <button className="border border-gray-400 px-6 py-3 rounded-lg hover:bg-gray-100 transition">
                        Learn More
                   </button>
               </div>

             </div>

             <div className="flex-1 flex justify-end">
                <img 
                src={heroImage} 
                alt="AI interview Illustration" 
                className="w-[500px] max-w-full h-auto" />
               
             </div>

            </div>
            
           
        </section>
    );

}

export default Hero;
