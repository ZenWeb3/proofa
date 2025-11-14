'use client'

const features = [
  {
    title: 'Instant Verification',
    description: 'Get your creative work verified on Story Protocol in minutes.',
  },
  {
    title: 'Telegram Native',
    description: 'Seamless integration with Telegram for easy access and management.',
  },
  {
    title: 'Wallet Transfer',
    description: 'Transfer your verified assets to any external wallet anytime.',
  },
  {
    title: 'Story Protocol',
    description: 'Built on Story Protocol for secure and transparent asset registration.',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      
      
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-16" data-aos="fade-up">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Powerful Features
          </h2>
          <p className="text-lg text-neutral-300 max-w-2xl mx-auto">
            Everything you need to verify and manage your creative assets
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              data-aos="fade-up"
              data-aos-delay={index * 100}
              className="group relative p-6 sm:p-8 rounded-2xl bg-neutral-900 border border-neutral-700 hover:border-[#3B0E97] transition duration-300"
            >
              <div className="relative space-y-4">

                {/* Icon Placeholder */}
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#3B0E97" }}
                >
                  <span className="text-white font-bold text-lg">•</span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white">{feature.title}</h3>

                {/* Description */}
                <p className="text-neutral-300 leading-relaxed">
                  {feature.description}
                </p>

              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
