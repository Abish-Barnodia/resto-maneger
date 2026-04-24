import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LayoutDashboard, 
  Receipt, 
  Table as TableIcon, 
  Package, 
  BarChart3, 
  Users, 
  ArrowRight,
  TrendingUp,
  ShoppingCart
} from 'lucide-react';
import Link from 'next/link';

export default function Index() {
  const features = [
    {
      title: 'POS & Billing',
      description: 'Quick service point of sale with GST compliance.',
      icon: Receipt,
      href: '/pos',
      color: 'bg-orange-100 text-orange-600',
    },
    {
      title: 'Table Management',
      description: 'Real-time table status and reservation tracking.',
      icon: TableIcon,
      href: '/tables',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Inventory',
      description: 'Stock level monitoring and automated consumption.',
      icon: Package,
      href: '/inventory',
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Analytics',
      description: 'Advanced sales reports and business insights.',
      icon: BarChart3,
      href: '/reports',
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navigation */}
      <nav className="border-b bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                F
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                FINBOOKS
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6">
              Modern POS for <span className="text-primary text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Smart Businesses</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              The all-in-one platform for Billing, Inventory, and Table Management. 
              Designed for performance, scale, and ease of use.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="h-12 px-8 text-lg gap-2">
                  Launch Dashboard <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg border-2">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
        
        {/* Background blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-200/20 rounded-full blur-[100px]" />
        </div>
      </header>

      {/* Feature Grid */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all duration-300 group">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-2xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={feature.href} className="text-sm font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                    Learn more <ArrowRight className="w-4 h-4" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p>© 2024 FINBOOKS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
