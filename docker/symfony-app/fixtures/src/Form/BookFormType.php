<?php

namespace App\Form;

use App\Entity\Book;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

/**
 * Постоянная фикстура — используется уроками 2-4 и мини-проектом как есть. Урок 1 просит
 * построить именно этот класс самостоятельно — в том упражнении targetPath подменяет собой
 * эту фикстуру.
 */
class BookFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('title', TextType::class, ['label' => 'Название'])
            ->add('year', IntegerType::class, ['label' => 'Год издания'])
            ->add('save', SubmitType::class, ['label' => 'Добавить книгу']);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Book::class,
        ]);
    }
}
