'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  Atom,
  ArrowRight,
  BarChart3,
  Package,
  FileText,
  Users,
  Briefcase,
  ShieldCheck,
  Beaker,
  Microscope,
  FlaskConical
} from 'lucide-react';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [loading, isAuthenticated, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // If authenticated, don't render landing (redirect will happen)
  if (isAuthenticated) return null;

  const features = [
    { icon: Package, title: 'Inventory', desc: 'Track products, stock levels & movements' },
    { icon: FileText, title: 'Invoicing', desc: 'Create invoices & quotations instantly' },
    { icon: Briefcase, title: 'Projects', desc: 'Manage projects, budgets & timelines' },
    { icon: Users, title: 'Contacts', desc: 'Organize clients, suppliers & partners' },
    { icon: BarChart3, title: 'Dashboard', desc: 'Real-time insights & activity tracking' },
    { icon: ShieldCheck, title: 'Access Control', desc: 'Role-based permissions & security' },
  ];

  return (
    <div className="landing-page min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="login-bg absolute inset-0" />
      <div className="login-shape login-shape-1" />
      <div className="login-shape login-shape-2" />
      <div className="login-shape login-shape-3" />
      <div className="login-shape login-shape-4" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 lg:px-20 py-5">
        <div className="flex items-center gap-3">
          <div className="login-logo-inner w-10 h-10 rounded-xl flex items-center justify-center">
            <Atom className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <span className="text-gray-800 font-bold text-lg tracking-tight">Scientific Solutions</span>
        </div>
        <Link
          href="/login"
          className="landing-nav-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
        >
          Sign In
          <ArrowRight className="w-4 h-4" />
        </Link>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 mb-6">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-blue-600 tracking-wide">Enterprise Resource Planning</span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 leading-tight max-w-3xl mb-5">
          Streamline Your
          <span className="landing-gradient-text"> Scientific Business</span>
        </h1>

        <p className="text-base md:text-lg text-gray-500 max-w-xl mb-10 leading-relaxed">
          Manage inventory, invoices, projects, and contacts — all in one powerful platform built for scientific solutions companies.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/login"
            className="login-btn flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold text-white text-base transition-all duration-300"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 px-6 md:px-12 lg:px-20 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="landing-feature-card group p-5 rounded-2xl transition-all duration-300"
              >
                <div className="landing-feature-icon w-10 h-10 rounded-xl flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-gray-800 font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center pb-8">
        <div className="flex items-center justify-center gap-4 mb-3">
          <Beaker className="w-4 h-4 text-blue-400/40" />
          <Microscope className="w-4 h-4 text-blue-400/40" />
          <FlaskConical className="w-4 h-4 text-blue-400/40" />
        </div>
        <p className="text-xs text-gray-400">
          © 2026 Scientific Solutions. All rights reserved.
        </p>
      </div>
    </div>
  );
}
