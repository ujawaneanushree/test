import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-8">
            Privacy <span className="text-gradient">Policy</span>
          </h1>
          
          <div className="prose prose-invert max-w-none space-y-8">
            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">1. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed">
                We collect information you provide directly to us, such as when you create an account, 
                upload media, create or join rooms, or contact us for support. This includes your email 
                address, display name, and any media files you choose to upload.
              </p>
            </section>

            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">2. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and manage your storage</li>
                <li>Send you technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends, usage, and activities</li>
              </ul>
            </section>

            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">3. Information Sharing</h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not share your personal information with third parties except as described in this 
                policy. We may share information with service providers who assist us in operating our 
                platform, conducting our business, or serving our users.
              </p>
            </section>

            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">4. Data Storage & Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your media files are stored securely with industry-standard encryption. We implement 
                appropriate technical and organizational measures to protect your personal data against 
                unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">5. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and associated data</li>
                <li>Export your data in a portable format</li>
                <li>Object to processing of your personal data</li>
              </ul>
            </section>

            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">6. Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar tracking technologies to track activity on our service and 
                hold certain information. You can instruct your browser to refuse all cookies or to 
                indicate when a cookie is being sent.
              </p>
            </section>

            <section className="glass-card p-6 rounded-lg">
              <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">7. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at{" "}
                <a href="mailto:privacy@cinesphere.com" className="text-primary hover:underline">
                  privacy@cinesphere.com
                </a>
              </p>
            </section>

            <p className="text-sm text-muted-foreground text-center pt-4">
              Last updated: January 2026
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
