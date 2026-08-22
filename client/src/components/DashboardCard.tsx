type DashboardCardProps = {
  title: string;
  description: string;
  icon: string;
  onClick?: () => void;
};

function DashboardCard({
  title,
  description,
  icon,
  onClick,
}: DashboardCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border"
    >
      <div className="text-5xl mb-4">{icon}</div>

      <h2 className="text-xl font-bold">{title}</h2>

      <p className="text-gray-500 mt-2">
        {description}
      </p>
    </div>
  );
}

export default DashboardCard;