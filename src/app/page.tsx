"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", email: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.name.trim() && formData.email.trim()) {
      router.push(`/exam?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}`);
    }
  };

  return (
  <div className="min-h-screen bg-gray-100">
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Left side - Instructions */}
        <div className="w-full md:w-1/2 bg-gray-800 text-white p-6 md:p-8 flex flex-col justify-center overflow-y-auto">
          <div className="w-full max-w-lg mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Exam Proctoring System</h1>
            <div className="space-y-4 md:space-y-5 text-sm">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-sm font-bold">!</span>
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold mb-1">Monitoring Active</h3>
                  <p className="text-gray-100">Your exam session will be monitored through camera and screen recording for academic integrity.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-sm font-bold">⚠</span>
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold mb-1">No Malpractice</h3>
                  <p className="text-gray-100">Any form of cheating, unauthorized assistance, or academic dishonesty will result in immediate disqualification.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold mb-1">Fair Examination</h3>
                  <p className="text-gray-100">Ensure a quiet environment, stable internet connection, and follow all exam guidelines for a smooth experience.</p>
                </div>
              </div>

              {/* Additional instructions */}
              <ul className="list-disc list-inside space-y-1.5 text-gray-100 text-sm">
                <li>Keep your face and eyes clearly visible; no masks, sunglasses, or obstructions.</li>
                <li>Do not cover the camera; dark or blurred video will end the exam.</li>
                <li>Background must be clean; no animated or virtual backgrounds.</li>
                <li>Only one person on screen; multiple faces will terminate the exam.</li>
                <li>No phones or external devices in camera view.</li>
                <li>Do not switch tabs/windows or open multiple exam tabs.</li>
                <li>No copy/cut/paste or right‑click; clipboard use will end the exam.</li>
                <li>Stay focused on the screen; prolonged gaze away will end the exam.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-8">
          <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full max-w-sm">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-center text-gray-900">Start Your Test</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border border-gray-600 text-gray-900 placeholder-gray-500 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent bg-white"
                  required
                />
              </div>
              <div>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border border-gray-600 text-gray-900 placeholder-gray-500 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent bg-white"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gray-800 text-white py-2.5 rounded-lg hover:bg-gray-900 transition-colors font-semibold text-base"
              >
                Start Test
              </button>
            </form>
            <p className="text-xs md:text-sm text-gray-600 text-center mt-3 md:mt-4">
              By clicking "Start Test", you agree to the monitoring terms and conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
