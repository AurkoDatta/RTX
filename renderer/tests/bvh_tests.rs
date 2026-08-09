use renderer::bvh::BvhNode;
use renderer::hittable::{Hittable, HittableList};
use renderer::primitives::sphere::Sphere;
use renderer::ray::Ray;
use renderer::vec3::{Point3, Vec3};

/// Ten spheres of radius 0.4 spaced one unit apart along the x-axis, each
/// sitting on its own z = -(5 + i) plane so a straight -z ray through x=i only
/// ever hits sphere i. Used to build both a BVH and a brute-force list from
/// identical geometry so their intersection results can be compared directly.
fn ten_spheres_along_x() -> Vec<(Point3, f64)> {
    (0..10)
        .map(|i| (Point3::new(i as f64, 0.0, -5.0 - i as f64), 0.4))
        .collect()
}

fn build_list(spheres: &[(Point3, f64)]) -> HittableList {
    let mut list = HittableList::new();
    for (center, radius) in spheres {
        list.add(Box::new(Sphere::new(*center, *radius)));
    }
    list
}

fn build_bvh(spheres: &[(Point3, f64)]) -> Box<dyn Hittable> {
    let objects: Vec<Box<dyn Hittable>> = spheres
        .iter()
        .map(|(center, radius)| Box::new(Sphere::new(*center, *radius)) as Box<dyn Hittable>)
        .collect();
    BvhNode::build(objects)
}

#[test]
fn bvh_bounding_box_encloses_every_leaf() {
    let spheres = ten_spheres_along_x();
    let bvh = build_bvh(&spheres);
    let bbox = bvh
        .bounding_box()
        .expect("a non-empty BVH must report a bounding box");

    for (center, radius) in &spheres {
        assert!(bbox.min.x <= center.x - radius && bbox.max.x >= center.x + radius);
        assert!(bbox.min.y <= center.y - radius && bbox.max.y >= center.y + radius);
        assert!(bbox.min.z <= center.z - radius && bbox.max.z >= center.z + radius);
    }
}

#[test]
fn bvh_intersection_matches_brute_force_for_every_sphere() {
    let spheres = ten_spheres_along_x();
    let list = build_list(&spheres);
    let bvh = build_bvh(&spheres);

    for (center, _) in &spheres {
        let ray = Ray::new(Point3::new(center.x, 0.0, 0.0), Vec3::new(0.0, 0.0, -1.0));
        let list_hit = list.hit(&ray, 0.0, f64::INFINITY);
        let bvh_hit = bvh.hit(&ray, 0.0, f64::INFINITY);

        match (list_hit, bvh_hit) {
            (Some(a), Some(b)) => assert!((a.t - b.t).abs() < 1e-9),
            (None, None) => {}
            other => panic!("BVH and brute-force list disagreed on a hit: {other:?}"),
        }
    }
}

#[test]
fn bvh_reports_no_hit_when_ray_misses_every_object() {
    let spheres = ten_spheres_along_x();
    let bvh = build_bvh(&spheres);

    // Well above every sphere, travelling parallel to none of them.
    let ray = Ray::new(Point3::new(0.0, 50.0, 0.0), Vec3::new(0.0, 0.0, -1.0));
    assert!(bvh.hit(&ray, 0.0, f64::INFINITY).is_none());
}

#[test]
fn bvh_picks_nearer_of_two_overlapping_spheres() {
    // Two spheres along the same ray path; the BVH must not let subtree
    // traversal order cause it to report the farther hit.
    let near = Point3::new(0.0, 0.0, -3.0);
    let far = Point3::new(0.0, 0.0, -8.0);
    let objects: Vec<Box<dyn Hittable>> = vec![
        Box::new(Sphere::new(far, 1.0)),
        Box::new(Sphere::new(near, 1.0)),
    ];
    let bvh = BvhNode::build(objects);

    let ray = Ray::new(Point3::new(0.0, 0.0, 0.0), Vec3::new(0.0, 0.0, -1.0));
    let hit = bvh.hit(&ray, 0.0, f64::INFINITY).unwrap();
    assert!((hit.t - 2.0).abs() < 1e-9); // near sphere's front face
}

#[test]
fn bvh_handles_single_object_without_wrapping_it_in_a_node() {
    let objects: Vec<Box<dyn Hittable>> =
        vec![Box::new(Sphere::new(Point3::new(0.0, 0.0, -5.0), 1.0))];
    let bvh = BvhNode::build(objects);

    let ray = Ray::new(Point3::new(0.0, 0.0, 0.0), Vec3::new(0.0, 0.0, -1.0));
    assert!(bvh.hit(&ray, 0.0, f64::INFINITY).is_some());
    assert!(bvh.bounding_box().is_some());
}

#[test]
fn bvh_of_empty_object_list_never_reports_a_hit() {
    let bvh = BvhNode::build(Vec::new());
    let ray = Ray::new(Point3::new(0.0, 0.0, 0.0), Vec3::new(0.0, 0.0, -1.0));
    assert!(bvh.hit(&ray, 0.0, f64::INFINITY).is_none());
    assert!(bvh.bounding_box().is_none());
}
