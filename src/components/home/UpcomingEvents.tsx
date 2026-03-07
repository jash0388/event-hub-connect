import { ArrowRight, Calendar, MapPin, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const upcomingEvents = [
  {
    id: 1,
    title: "Spring Hackathon 2026",
    date: "March 15-17, 2026",
    time: "9:00 AM",
    location: "Main Campus Hall",
    category: "Hackathon",
    categoryColor: "bg-[hsl(var(--accent))]",
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=250&fit=crop",
  },
  {
    id: 2,
    title: "AI & Machine Learning Workshop",
    date: "March 22, 2026",
    time: "2:00 PM",
    location: "Tech Hub - Room 301",
    category: "Workshop",
    categoryColor: "bg-[hsl(var(--sage))]",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=250&fit=crop",
  },
  {
    id: 3,
    title: "Web3 & Blockchain Meetup",
    date: "April 5, 2026",
    time: "6:00 PM",
    location: "Innovation Center",
    category: "Networking",
    categoryColor: "bg-[hsl(var(--sky))]",
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=250&fit=crop",
  },
];

export function UpcomingEvents() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-12">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-sm font-medium text-foreground mb-4">
              Coming Soon
            </span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Upcoming Events
            </h2>
          </div>
          <Link to="/events">
            <Button
              variant="outline"
              className="rounded-full border-border hover:bg-secondary group"
            >
              View All Events
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingEvents.map((event, index) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="group bg-card rounded-3xl overflow-hidden border border-border card-3d"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-background ${event.categoryColor}`}
                  >
                    {event.category}
                  </span>
                </div>
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-foreground group-hover:text-[hsl(var(--accent))] transition-colors">
                  {event.title}
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-6 flex items-center text-sm font-medium text-foreground group-hover:text-[hsl(var(--accent))] transition-colors">
                  Learn More
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 md:p-8 rounded-3xl bg-secondary/50 border border-border">
            <div className="text-left">
              <h3 className="text-xl font-semibold text-foreground mb-1">
                Want to host an event?
              </h3>
              <p className="text-muted-foreground text-sm">
                Partner with us to reach thousands of students
              </p>
            </div>
            <Link to="/contact">
              <Button className="rounded-full bg-foreground text-background hover:bg-foreground/90">
                Get in Touch
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
