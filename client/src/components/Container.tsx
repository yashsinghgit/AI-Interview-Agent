import type { ReactNode } from "react";

type ContainerProps ={
    children: ReactNode;
};

function Container({children } : ContainerProps) {
    return (
        <div className="max-w-7xl mx-auto px-8 py-12">
            {children}
        </div>

    );

}
export default Container;